
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { UserData, MCQHistory } from '@/lib/types';
import { ADMIN_EMAILS } from '@/lib/constants';

export const runtime = 'nodejs';

// This function can take a while, so we increase the max duration.
// Note: This might depend on your deployment platform's configuration.
export const maxDuration = 120; 

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const usersRef = adminDb.collection('users');
        const usersSnapshot = await usersRef.get();
        const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));

        const historyRef = adminDb.collection('mcqHistory');
        const historySnapshot = await historyRef.get();
        const allHistory = historySnapshot.docs.map(doc => doc.data() as MCQHistory);

        // Group history by userId for efficient lookup
        const historyByUser = new Map<string, MCQHistory[]>();
        for (const historyItem of allHistory) {
            const userHistory = historyByUser.get(historyItem.userId) || [];
            userHistory.push(historyItem);
            historyByUser.set(historyItem.userId, userHistory);
        }

        const batch = adminDb.batch();
        let updatedCount = 0;

        for (const user of allUsers) {
            // Skip admins from count reconciliation
            if (ADMIN_EMAILS.includes(user.email)) {
                continue;
            }

            const userHistory = historyByUser.get(user.uid) || [];

            const correctTopicExamsTaken = userHistory.filter(h => !h.isMockTest).length;
            const correctMockTestsTaken = userHistory.filter(h => h.isMockTest).length;
            
            const currentTopicExamsTaken = user.topicExamsTaken || 0;
            const currentMockTestsTaken = user.mockTestsTaken || 0;

            if (
                correctTopicExamsTaken !== currentTopicExamsTaken ||
                correctMockTestsTaken !== currentMockTestsTaken
            ) {
                const userDocRef = usersRef.doc(user.uid);
                batch.update(userDocRef, {
                    topicExamsTaken: correctTopicExamsTaken,
                    mockTestsTaken: correctMockTestsTaken,
                });
                updatedCount++;
            }
        }
        
        // Commit the batch if there are updates to be made
        if (updatedCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({ 
            message: 'Reconciliation complete.', 
            updatedCount: updatedCount,
            scannedUsers: allUsers.length,
        });

    } catch (error: any) {
        console.error("Error during exam count reconciliation:", error);
        return NextResponse.json({ error: 'Failed to reconcile exam counts.' }, { status: 500 });
    }
}
