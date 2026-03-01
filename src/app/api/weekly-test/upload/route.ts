import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
    const db = getFirebaseDb();
    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const examCategory = formData.get('examCategory') as string;

        if (!file || !title || !examCategory) {
            return NextResponse.json({ error: 'Missing required fields: title, examCategory, and file are required.' }, { status: 400 });
        }

        const content = await file.text();
        
        // 1. First, save the question content to the liveTestBank collection
        const bankRef = await addDoc(collection(db, 'liveTestBank'), {
            fileName: `${title}_${Date.now()}.json`,
            examCategory,
            content,
            uploadedAt: new Date()
        });

        // 2. Create the Weekly Test entry referencing the bank document
        const weeklyTestRef = await addDoc(collection(db, 'weeklyTests'), {
            title,
            examCategory,
            questionPaperId: bankRef.id,
            createdAt: serverTimestamp()
        });

        return NextResponse.json({
            message: 'Weekly test created successfully.',
            newTest: {
                id: weeklyTestRef.id,
                title,
                examCategory,
                questionPaperId: bankRef.id,
                createdAt: new Date()
            }
        });

    } catch (error: any) {
        console.error('API Error in weekly-test upload:', error);
        return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
    }
}
