
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }
        
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({
            isPro: true,
            proValidUntil: proValidUntil,
            topicExamsTaken: 0,
            mockTestsTaken: 0,
        });

        return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });

    } catch (error: any) {
        console.error("Error upgrading user to pro:", error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
