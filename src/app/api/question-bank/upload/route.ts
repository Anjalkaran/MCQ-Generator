import { NextResponse } from 'next/server';
import { getFirebaseDb, admin } from '@/lib/firebase-admin';
import { ADMIN_EMAILS } from '@/lib/constants';

/**
 * @fileOverview API route to handle multi-file uploads for Previous Year Question Papers.
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
        const files = formData.getAll('files') as File[];
        const examCategory = formData.get('examCategory') as string;
        const examYear = formData.get('examYear') as string;

        if (files.length === 0 || !examCategory) {
            return NextResponse.json({ error: 'Missing required fields: examCategory and at least one file are required.' }, { status: 400 });
        }

        const newDocuments: any[] = [];
        
        for (const file of files) {
            const fileName = file.name;
            if (fileName.toLowerCase().endsWith('.json')) {
                try {
                    const textContent = await file.text();
                    const parsed = JSON.parse(textContent);
                    
                    // Validate basic JSON structure - handle both { questions: [] } and straight [ { question: "" } ]
                    let questions = [];
                    if (Array.isArray(parsed)) {
                        questions = parsed;
                    } else if (parsed.questions && Array.isArray(parsed.questions)) {
                        questions = parsed.questions;
                    } else if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
                        questions = parsed.mcqs;
                    } else if (parsed.mcq && Array.isArray(parsed.mcq)) {
                        questions = parsed.mcq;
                    } else if (parsed.data && Array.isArray(parsed.data)) {
                        questions = parsed.data;
                    } else if (parsed.items && Array.isArray(parsed.items)) {
                        questions = parsed.items;
                    } else if (parsed.paper && Array.isArray(parsed.paper)) {
                        questions = parsed.paper;
                    }

                    if (questions.length === 0) {
                        console.warn(`File ${fileName} has no valid question array. Skipping.`);
                        continue;
                    }

                    const docData: any = {
                        fileName,
                        examCategory,
                        content: JSON.stringify({ questions }), // Canonicalize to { questions: [...] }
                        uploadedAt: admin.firestore.Timestamp.now()
                    };

                    if (examYear) {
                        docData.examYear = examYear;
                    }

                    const docRef = await db.collection('questionBank').add(docData);
                    
                    newDocuments.push({
                        id: docRef.id,
                        ...docData,
                        uploadedAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error(`Failed to parse JSON in file ${fileName}:`, err);
                }
            }
        }

        if (newDocuments.length === 0) {
            return NextResponse.json({ error: 'No valid "questions" papers were found in the provided files.' }, { status: 400 });
        }

        return NextResponse.json({
            message: `${newDocuments.length} papers uploaded successfully.`,
            newDocuments // Return the array of all newly created documents
        });

    } catch (error: any) {
        console.error('Question Bank Upload API Error:', error);
        return NextResponse.json({ 
            error: error.message || 'An unexpected server error occurred during upload.'
        }, { status: 500 });
    }
}
