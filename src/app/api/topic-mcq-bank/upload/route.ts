import { NextResponse } from 'next/server';
import { getFirebaseDb, admin } from '@/lib/firebase-admin';
import { ADMIN_EMAILS } from '@/lib/constants';

/**
 * @fileOverview API route to handle multi-file uploads for Topic-Specific MCQs.
 * Merges questions from all uploaded JSON files into a single document for the selected topic.
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
        return !!hasAccess;
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
        const files = formData.getAll('files') as File[]; // Note: 'files' plural based on client code
        const topicId = formData.get('topicId') as string;
        const topicTitle = formData.get('topicTitle') as string;

        if (files.length === 0 || !topicId) {
            return NextResponse.json({ error: 'Missing required fields: topicId and at least one file are required.' }, { status: 400 });
        }

        let allQuestions: any[] = [];
        
        // Process and merge all uploaded JSON files
        for (const file of files) {
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.json')) {
                const textContent = await file.text();
                try {
                    const parsed = JSON.parse(textContent);
                    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || []);
                    if (Array.isArray(questions)) {
                        allQuestions.push(...questions);
                    }
                } catch (err) {
                    console.error(`Failed to parse JSON in file ${file.name}:`, err);
                }
            } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                // If docx parsing becomes available, implement here. 
                // Currently just skip or return error if only docx provided.
                console.warn(`Docx file ${file.name} uploaded but parsing is not yet implemented.`);
            }
        }

        if (allQuestions.length === 0) {
            return NextResponse.json({ error: 'No valid questions were found in the provided JSON files.' }, { status: 400 });
        }

        // Store the merged content as a string
        const finalContent = JSON.stringify({ questions: allQuestions });
        
        // Save to topicMCQs collection
        const docData = {
            topicId,
            fileName: `${topicTitle}_${Date.now()}.json`,
            content: finalContent,
            uploadedAt: admin.firestore.Timestamp.now()
        };

        const docRef = await db.collection('topicMCQs').add(docData);

        return NextResponse.json({
            message: 'Topic MCQs uploaded successfully.',
            newDocument: {
                id: docRef.id,
                ...docData,
                uploadedAt: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Topic MCQ Upload API Error:', error);
        return NextResponse.json({ 
            error: error.message || 'An unexpected server error occurred during upload.'
        }, { status: 500 });
    }
}
