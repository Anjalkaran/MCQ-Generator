
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview API route to handle multi-file uploads for Weekly Tests.
 * Merges questions from all uploaded JSON files into a single master document.
 */

export async function POST(request: Request) {
    const db = getFirebaseDb();
    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];
        const title = formData.get('title') as string;
        const examCategories = formData.getAll('examCategories') as string[];

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
        const bankRef = await addDoc(collection(db, 'liveTestBank'), {
            fileName: `${title}_merged_${Date.now()}.json`,
            examCategory: examCategories[0], 
            content: finalContent,
            uploadedAt: new Date()
        });

        // 2. Create the Weekly Test entry referencing the bank document
        const weeklyTestRef = await addDoc(collection(db, 'weeklyTests'), {
            title,
            examCategories,
            questionPaperId: bankRef.id,
            createdAt: serverTimestamp()
        });

        return NextResponse.json({
            message: 'Weekly test created successfully with merged questions.',
            newTest: {
                id: weeklyTestRef.id,
                title,
                examCategories,
                questionPaperId: bankRef.id,
                createdAt: new Date()
            }
        });

    } catch (error: any) {
        console.error('API Error in weekly-test upload:', error);
        return NextResponse.json({ error: error.message || 'An unexpected server error occurred during upload.' }, { status: 500 });
    }
}
