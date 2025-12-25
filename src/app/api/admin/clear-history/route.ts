
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';
export const maxDuration = 300; 

async function deleteCollection(collectionPath: string, batchSize: number) {
    if (!adminDb) return 0;
    const collectionRef = adminDb.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    let deleted = 0;

    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            break;
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        deleted += snapshot.size;
    }
    return deleted;
}


export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        // 1. Delete all documents in mcqHistory collection
        const deletedCount = await deleteCollection('mcqHistory', 100);

        // 2. Reset counts on all user documents
        const usersRef = adminDb.collection('users');
        const usersSnapshot = await usersRef.get();
        
        if (!usersSnapshot.empty) {
            const batch = adminDb.batch();
            usersSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    totalExamsTaken: 0,
                    liveTestsTaken: [],
                    completedMockBankTests: [],
                });
            });
            await batch.commit();
        }

        return NextResponse.json({ 
            message: 'All exam history and user counts have been reset.', 
            deletedHistoryItems: deletedCount,
            updatedUserCount: usersSnapshot.size
        });

    } catch (error: any) {
        console.error("Error clearing exam history:", error);
        return NextResponse.json({ error: 'Failed to clear all exam history.' }, { status: 500 });
    }
}
