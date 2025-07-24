
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({
            lastSeen: FieldValue.serverTimestamp(),
        });
        
        return NextResponse.json({ status: 'success' });

    } catch (error: any) {
        // Don't log expected errors for users that might not exist yet during registration.
        if (error.code !== 5) { // 5 = NOT_FOUND
             console.error("Error updating user lastSeen:", error);
        }
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
