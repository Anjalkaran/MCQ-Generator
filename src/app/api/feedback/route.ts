
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const { userId, userName, rating, comment } = await req.json();

        if (!userId || !userName || !rating) {
            return NextResponse.json({ error: 'User ID, name, and rating are required.' }, { status: 400 });
        }
        
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be a number between 1 and 5.' }, { status: 400 });
        }

        const feedbackData = {
            userId,
            userName,
            rating,
            comment: comment || '',
            createdAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection('feedback').add(feedbackData);
        
        return NextResponse.json({ status: 'success', message: 'Feedback submitted successfully.' });

    } catch (error: any) {
        console.error("Error submitting feedback:", error);
        return NextResponse.json({ error: 'An internal server error occurred while submitting feedback.' }, { status: 500 });
    }
}
