
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
        
        return NextResponse.json({ onlineUserCount: onlineSnapshot.size });

    } catch (error: any) {
        console.error("Error fetching online user count:", error);
        return NextResponse.json({ error: 'Failed to fetch online user count.' }, { status: 500 });
    }
}
