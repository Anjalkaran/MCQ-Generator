import { NextResponse } from 'next/server';
import { getFirebaseDb, admin } from '@/lib/firebase-admin';
import { ADMIN_EMAILS } from '@/lib/constants';

/**
 * @fileOverview API route to handle multi-file uploads for Weekly Tests.
 * Merges questions from all uploaded JSON files into a single master document.
 */

async function isAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        console.error('Missing or invalid Authorization header');
        return false;
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const hasAccess = decodedToken.email && ADMIN_EMAILS.includes(decodedToken.email);
        if (!hasAccess) {
            console.warn(`User ${decodedToken.email} is authenticated but NOT in ADMIN_EMAILS list.`);
        }
        return hasAccess;
    } catch (error) {
        console.error('Error verifying ID token:', error);
        return false;
    }
}

export async function POST(request: Request) {
    if (!await isAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const db = getFirebaseDb();

    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];
        const title = formData.get('title') as string;
        const examCategories = formData.getAll('examCategories') as string[];
        const duration = formData.get('duration') ? parseInt(formData.get('duration') as string) : null;
        const scheduledAtStr = formData.get('scheduledAt') as string;
        const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;

        if (files.length === 0 || !title || !examCategories || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: title, categories, and at least one file are required.' }, { status: 400 });
        }

        let allQuestions: any[] = [];
        
        // Process and merge all uploaded files
        for (const file of files) {
            const textContent = await file.text();
            try {
                const parsed = JSON.parse(textContent);
                // Handle the user's specific format: { "questions": [...] }
                if (parsed.questions && Array.isArray(parsed.questions)) {
                    allQuestions.push(...parsed.questions);
                } else if (Array.isArray(parsed)) {
                    // Fallback for direct array format
                    allQuestions.push(...parsed);
                }
            } catch (err) {
                console.error(`Failed to parse file ${file.name}:`, err);
                return NextResponse.json({ error: `File ${file.name} is not a valid JSON document.` }, { status: 400 });
            }
        }

        if (allQuestions.length === 0) {
            return NextResponse.json({ error: 'No valid questions were found in the provided files. Ensure the JSON contains a "questions" array.' }, { status: 400 });
        }

        // Store the merged content as a string to stay under document limits if necessary
        const finalContent = JSON.stringify({ questions: allQuestions });
        
        // 1. Save the merged question content to the liveTestBank collection
        const bankRef = await db.collection('liveTestBank').add({
            fileName: `${title}_merged_${Date.now()}.json`,
            examCategory: examCategories[0], 
            content: finalContent,
            uploadedAt: admin.firestore.Timestamp.now()
        });

        // 2. Create the Weekly Test entry referencing the bank document
        const weeklyTestRef = await db.collection('weeklyTests').add({
            title,
            examCategories,
            questionPaperId: bankRef.id,
            duration,
            scheduledAt: scheduledAt ? admin.firestore.Timestamp.fromDate(scheduledAt) : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            message: 'Weekly test created successfully with merged questions.',
            newTest: {
                id: weeklyTestRef.id,
                title,
                examCategories,
                questionPaperId: bankRef.id,
                duration,
                scheduledAt: scheduledAt || undefined,
                createdAt: new Date()
            }
        });

    } catch (error: any) {
        console.error('FULL API Error Object:', error);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
        return NextResponse.json({ 
            error: error.message || 'An unexpected server error occurred during upload.',
            details: error.code === 7 ? 'Firestore Permission Denied inside Admin SDK. Please check IAM roles.' : undefined
        }, { status: 500 });
    }
}
