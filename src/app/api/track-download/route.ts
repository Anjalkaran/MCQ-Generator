
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const { userId, userName, materialId, fileTitle, fileName } = await req.json();

        if (!userId || !userName || !materialId || !fileTitle || !fileName) {
            return NextResponse.json({ error: 'Missing required tracking information.' }, { status: 400 });
        }
        
        // Check for recent duplicates
        const oneMinuteAgo = Timestamp.fromMillis(Date.now() - 60 * 1000);
        const recentDownloadsQuery = adminDb.collection('downloadHistory')
            .where('userId', '==', userId)
            .where('materialId', '==', materialId)
            .where('downloadedAt', '>=', oneMinuteAgo)
            .limit(1);

        const recentDownloadsSnapshot = await recentDownloadsQuery.get();
        if (!recentDownloadsSnapshot.empty) {
            // A recent download exists, so don't create a new entry
            return NextResponse.json({ status: 'success', message: 'Download already tracked recently.' });
        }


        const downloadData = {
            userId,
            userName,
            materialId,
            fileTitle,
            fileName,
            downloadedAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection('downloadHistory').add(downloadData);
        
        return NextResponse.json({ status: 'success', message: 'Download tracked successfully.' });

    } catch (error: any) {
        console.error("Error tracking download:", error);
        return NextResponse.json({ error: 'An internal server error occurred while tracking the download.' }, { status: 500 });
    }
}
