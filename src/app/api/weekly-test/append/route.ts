
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * @fileOverview API route to append questions to an existing Weekly Test.
 */

export async function POST(request: Request) {
    const db = getFirebaseDb();
    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];
        const weeklyTestId = formData.get('weeklyTestId') as string;

        if (files.length === 0 || !weeklyTestId) {
            return NextResponse.json({ error: 'Missing required fields: test ID and at least one file are required.' }, { status: 400 });
        }

        // 1. Get the Weekly Test to find its bank ID
        const weeklyTestRef = doc(db, 'weeklyTests', weeklyTestId);
        const weeklyTestSnap = await getDoc(weeklyTestRef);

        if (!weeklyTestSnap.exists()) {
            return NextResponse.json({ error: 'Weekly test not found.' }, { status: 404 });
        }

        const { questionPaperId } = weeklyTestSnap.data();
        if (!questionPaperId) {
            return NextResponse.json({ error: 'This test does not have an associated question paper.' }, { status: 400 });
        }

        // 2. Get existing questions from the bank
        const bankRef = doc(db, 'liveTestBank', questionPaperId);
        const bankSnap = await getDoc(bankRef);

        let existingQuestions: any[] = [];
        if (bankSnap.exists()) {
            try {
                const bankData = JSON.parse(bankSnap.data().content);
                existingQuestions = bankData.questions || [];
            } catch (e) {
                console.warn("Could not parse existing bank content, starting fresh.");
            }
        }

        // 3. Process and merge new files
        let newQuestions: any[] = [];
        for (const file of files) {
            const textContent = await file.text();
            try {
                const parsed = JSON.parse(textContent);
                if (parsed.questions && Array.isArray(parsed.questions)) {
                    newQuestions.push(...parsed.questions);
                } else if (Array.isArray(parsed)) {
                    newQuestions.push(...parsed);
                }
            } catch (err) {
                return NextResponse.json({ error: `File ${file.name} is not a valid JSON document.` }, { status: 400 });
            }
        }

        if (newQuestions.length === 0) {
            return NextResponse.json({ error: 'No valid questions found in uploaded files.' }, { status: 400 });
        }

        // 4. Update the bank document
        const finalContent = JSON.stringify({ questions: [...existingQuestions, ...newQuestions] });
        await updateDoc(bankRef, {
            content: finalContent,
            lastAppendedAt: new Date()
        });

        return NextResponse.json({
            message: `Successfully appended ${newQuestions.length} questions.`,
            totalQuestions: existingQuestions.length + newQuestions.length
        });

    } catch (error: any) {
        console.error('API Error in weekly-test append:', error);
        return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
    }
}
