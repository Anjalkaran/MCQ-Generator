
import { getFirebaseDb } from './firebase-admin';
import type { TopicMCQ, MCQHistory, UserData, LeaderboardEntry } from './types';
import { normalizeDate } from './utils';
import { ADMIN_EMAILS, LEADERBOARD_RESET_DATE } from './constants';

/**
 * Server-side version of getAllUsers using Firebase Admin SDK.
 */
export const getAllUsersAdmin = async (): Promise<UserData[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
    } catch (error) {
        console.error("Error fetching all users (admin):", error);
        return [];
    }
};

/**
 * Server-side version of getLiveTestsForLeaderboard using Firebase Admin SDK.
 */
export const getLiveTestsForLeaderboardAdmin = async (): Promise<any[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    
    try {
        const snapshot = await db.collection('weeklyTests').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                title: data.title,
                examCategories: data.examCategories || [],
                startTime: normalizeDate(data.createdAt),
                createdAt: normalizeDate(data.createdAt)
            };
        });
    } catch (error) {
        console.error("Error fetching live tests (admin):", error);
        return [];
    }
};

/**
 * OPTIMIZED LEADERBOARD FETCHING (ADMIN VERSION)
 * Uses Firebase Admin SDK to bypass client-side auth requirements in Server Components.
 */
export const getUnifiedLeaderboardsAdmin = async (): Promise<{
    topics: Record<UserData['examCategory'], LeaderboardEntry[]>;
    mocks: Record<UserData['examCategory'], LeaderboardEntry[]>;
    pastLiveTests: any[];
}> => {
    const db = getFirebaseDb();
    if (!db) return { topics: {} as any, mocks: {} as any, pastLiveTests: [] };

    try {
        // 1. Fetch ALL users once (needed for categorization)
        const allUsers = await getAllUsersAdmin();
        const users = allUsers.filter(u => u.email && !ADMIN_EMAILS.includes(u.email));
        const userMap = new Map(users.map(u => [u.uid, u]));

        // 2. Fetch history since reset date
        const historyRef = db.collection('mcqHistory');
        const historySnapshot = await historyRef
            .where('takenAt', '>=', LEADERBOARD_RESET_DATE)
            .get();
        
        const histories = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MCQHistory));

        // 3. Process Topic and Mock Leaderboards
        const categories: UserData['examCategory'][] = ['MTS', 'POSTMAN', 'PA', 'IP'];
        const topicCalculations = new Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>();
        const mockCalculations = new Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>();

        histories.forEach(h => {
            if (!userMap.has(h.userId)) return;
            const target = h.isMockTest ? mockCalculations : topicCalculations;
            const current = target.get(h.userId) || { totalScore: 0, totalQuestions: 0, totalExams: 0 };
            
            const score = Number(h.score || 0);
            const questionCount = Number(h.totalQuestions || 0);
            
            current.totalScore += score;
            current.totalQuestions += questionCount;
            current.totalExams += 1;
            target.set(h.userId, current);
        });

        const generateLeaderboard = (calcMap: Map<string, any>, cat: UserData['examCategory']) => {
            const entries: LeaderboardEntry[] = [];
            calcMap.forEach((perf, userId) => {
                const user = userMap.get(userId);
                if (user && user.examCategory === cat) {
                    if (perf.totalExams > 0) {
                        entries.push({
                            userId,
                            userName: user.name || "Anonymous",
                            examCategory: user.examCategory,
                            averageScore: (perf.totalQuestions > 0) ? (perf.totalScore / perf.totalQuestions) * 100 : 0,
                            totalExams: perf.totalExams,
                            rank: 0
                        });
                    }
                }
            });
            return entries
                .sort((a, b) => b.averageScore - a.averageScore)
                .slice(0, 50)
                .map((e, i) => ({ ...e, rank: i + 1 }));
        };

        const topicsResult = {} as any;
        const mocksResult = {} as any;
        categories.forEach(cat => {
            topicsResult[cat] = generateLeaderboard(topicCalculations, cat);
            mocksResult[cat] = generateLeaderboard(mockCalculations, cat);
        });

        // 4. Fetch Live Tests list
        const liveTests = await getLiveTestsForLeaderboardAdmin();

        return { topics: topicsResult, mocks: mocksResult, pastLiveTests: liveTests };
    } catch (error) {
        console.error("Unified leaderboard error (admin):", error);
        return { topics: {} as any, mocks: {} as any, pastLiveTests: [] };
    }
};

/**
 * Server-side version of getTopicMCQs using Firebase Admin SDK.
 */
export const getTopicsAdmin = async (): Promise<any[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    const snapshot = await db.collection('topics').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Server-side version of getReasoningQuestions using Firebase Admin SDK.
 */
export const getReasoningQuestionsAdmin = async (): Promise<any[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    const snapshot = await db.collection('reasoningBank').orderBy('uploadedAt', 'desc').get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data, 
            uploadedAt: normalizeDate(data.uploadedAt) || new Date() 
        };
    });
};

/**
 * Server-side version of getTopicMCQs using Firebase Admin SDK.
 */
export const getTopicMCQsAdmin = async (topicId?: string): Promise<TopicMCQ[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    
    let query: any = db.collection('topicMCQs');
    
    if (topicId) {
        query = query.where('topicId', '==', topicId);
    } else {
        query = query.orderBy('uploadedAt', 'desc');
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data, 
            uploadedAt: normalizeDate(data.uploadedAt) || new Date() 
        } as TopicMCQ;
    });
};

/**
 * Server-side version of getExamHistoryForUser using Firebase Admin SDK.
 */
export const getExamHistoryForUserAdmin = async (userId: string): Promise<MCQHistory[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    
    const historyCollection = db.collection('mcqHistory');
    const snapshot = await historyCollection.where('userId', '==', userId).get();
    
    const history: MCQHistory[] = [];
    snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const takenAt = normalizeDate(data.takenAt) || new Date();
        history.push({ 
            id: doc.id, 
            ...data, 
            topicTitle: data.topicTitle || 'Mock Test', 
            takenAt 
        } as MCQHistory);
    });
    
    history.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    return history;
};
