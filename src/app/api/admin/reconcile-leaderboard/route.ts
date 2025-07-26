
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { MCQHistory } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120; 

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const historyRef = adminDb.collection('mcqHistory');
        // Get all history items that are part of a live test
        const liveTestHistoryQuery = historyRef.where('liveTestId', '!=', null);
        const snapshot = await liveTestHistoryQuery.get();

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No live test entries to reconcile.', deletedCount: 0 });
        }

        const histories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MCQHistory));

        const entriesByUserAndTest = new Map<string, MCQHistory[]>();

        // Group entries by a composite key of userId and liveTestId
        for (const historyItem of histories) {
            if (historyItem.userId && historyItem.liveTestId) {
                const key = `${historyItem.userId}_${historyItem.liveTestId}`;
                const userEntries = entriesByUserAndTest.get(key) || [];
                userEntries.push(historyItem);
                entriesByUserAndTest.set(key, userEntries);
            }
        }

        const docsToDelete: string[] = [];

        // Identify duplicates for each user in each test
        for (const [key, entries] of entriesByUserAndTest.entries()) {
            if (entries.length > 1) {
                // Sort entries to find the best one to keep
                // Best is highest score, then lowest duration
                entries.sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return (a.durationInSeconds ?? Infinity) - (b.durationInSeconds ?? Infinity);
                });
                
                // The first entry is the best, mark the rest for deletion
                const duplicates = entries.slice(1);
                duplicates.forEach(dup => docsToDelete.push(dup.id));
            }
        }
        
        if (docsToDelete.length > 0) {
            const batch = adminDb.batch();
            docsToDelete.forEach(docId => {
                batch.delete(historyRef.doc(docId));
            });
            await batch.commit();
        }

        return NextResponse.json({ 
            message: 'Live test leaderboard reconciliation complete.', 
            deletedCount: docsToDelete.length,
            scannedEntries: histories.length,
        });

    } catch (error: any) {
        console.error("Error during leaderboard reconciliation:", error);
        return NextResponse.json({ error: 'Failed to reconcile leaderboard data.' }, { status: 500 });
    }
}
