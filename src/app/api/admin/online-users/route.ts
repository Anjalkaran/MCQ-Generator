
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { UserData } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const twoMinutesAgo = Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
        const usersRef = adminDb.collection('users');
        const onlineQuery = usersRef.where('lastSeen', '>', twoMinutesAgo);
        const onlineSnapshot = await onlineQuery.get();
        
        const onlineUsers = onlineSnapshot.docs.map(doc => {
            const data = doc.data() as UserData;
            return {
                uid: doc.id,
                name: data.name,
                email: data.email,
            };
        });
        
        return NextResponse.json({ onlineUsers });

    } catch (error: any) {
        console.error("Error fetching online users:", error);
        return NextResponse.json({ error: 'Failed to fetch online users.' }, { status: 500 });
    }
}
