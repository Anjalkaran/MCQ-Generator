
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// This is the initial structure of our poll.
// The vote counts are now restored based on the user-provided image.
const initialPollData = {
    id: "ip-marks-2025",
    question: "IP exam mark paper 1 and paper 3 total",
    options: [
        { id: "opt12", text: "511-530", votes: 0 },
        { id: "opt11", text: "491-510", votes: 0 },
        { id: "opt1", text: "480-490", votes: 1 },
        { id: "opt2", text: "460-479", votes: 6 },
        { id: "opt3", text: "450-459", votes: 1 },
        { id: "opt4", text: "440-449", votes: 4 },
        { id: "opt5", text: "430-439", votes: 7 },
        { id: "opt6", text: "420-429", votes: 7 },
        { id: "opt7", text: "410-419", votes: 9 },
        { id: "opt8", text: "400-409", votes: 4 },
        { id: "opt9", text: "390-399", votes: 7 },
        { id: "opt10", text: "370-389", votes: 0 },
        { id: "opt13", text: "350-369", votes: 0 },
    ],
};

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const { pollId } = await req.json();

        if (pollId !== "ip-marks-2025") {
             return NextResponse.json({ error: 'Invalid poll ID.' }, { status: 400 });
        }

        const pollRef = adminDb.collection('polls').doc(pollId);
        const pollSnap = await pollRef.get();

        if (!pollSnap.exists) {
            // If the document does not exist, create it with the initial data.
            // This prevents the client from ever resetting the data.
            await pollRef.set(initialPollData);
            return NextResponse.json({ status: 'success', message: 'Poll initialized successfully with restored data.' });
        }

        return NextResponse.json({ status: 'success', message: 'Poll already exists.' });

    } catch (error: any) {
        console.error("Error initializing poll:", error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
