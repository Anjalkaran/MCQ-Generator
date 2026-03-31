import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { ADMIN_EMAILS } from '@/lib/constants';

/**
 * @fileOverview API route to append questions to an existing Daily Test.
 */

async function isAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.email && ADMIN_EMAILS.includes(decodedToken.email);
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
        const dailyTestId = formData.get('dailyTestId') as string;

        if (files.length === 0 || !dailyTestId) {
            return NextResponse.json({ error: 'Missing required fields: test ID and at least one file are required.' }, { status: 400 });
        }

        // 1. Get the Daily Test to find its bank ID
        const dailyTestRef = db.collection('dailyTests').doc(dailyTestId);
        const dailyTestSnap = await dailyTestRef.get();

        if (!dailyTestSnap.exists) {
            return NextResponse.json({ error: 'Daily test not found.' }, { status: 404 });
        }

        const questionPaperId = dailyTestSnap.get('questionPaperId');
        if (!questionPaperId) {
            return NextResponse.json({ error: 'This test does not have an associated question paper.' }, { status: 400 });
        }

        // 2. Get existing questions from the bank
        const bankRef = db.collection('liveTestBank').doc(questionPaperId);
        const bankSnap = await bankRef.get();

        let existingQuestions: any[] = [];
        if (bankSnap.exists) {
            try {
                const bankData = JSON.parse(bankSnap.get('content'));
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
        await bankRef.update({
            content: finalContent,
            lastAppendedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            message: `Successfully appended ${newQuestions.length} questions.`,
            totalQuestions: existingQuestions.length + newQuestions.length
        });

    } catch (error: any) {
        console.error('API Error in daily-test append:', error);
        return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
    }
}
