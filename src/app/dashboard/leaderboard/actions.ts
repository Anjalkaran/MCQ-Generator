'use server';

import { getLiveTestLeaderboardDataAdmin } from '@/lib/firestore-admin';
import { LeaderboardEntry } from '@/lib/types';

/**
 * Server Action to fetch rankings for a specific live/weekly/daily test.
 * This is used to bypass client-side Firestore rules and improve performance.
 */
export async function getLiveTestRankingsAction(testId: string, questionPaperId?: string): Promise<LeaderboardEntry[]> {
    if (!testId) return [];
    try {
        return await getLiveTestLeaderboardDataAdmin(testId, questionPaperId);
    } catch (error) {
        console.error("Error in getLiveTestRankingsAction:", error);
        return [];
    }
}
