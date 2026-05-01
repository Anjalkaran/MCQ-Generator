
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

export const getUserDataAdmin = async (userId: string): Promise<UserData | null> => {
    const db = getFirebaseDb();
    if (!db) return null;
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            return { uid: doc.id, ...doc.data() } as UserData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user data (admin):", error);
        return null;
    }
};


/**
 * Server-side version of getLiveTestsForLeaderboard using Firebase Admin SDK.
 */
export const getLiveTestsForLeaderboardAdmin = async (): Promise<{ weekly: any[]; daily: any[] }> => {
    const db = getFirebaseDb();
    if (!db) return { weekly: [], daily: [] };
    
    try {
        const [weeklySnap, dailySnap] = await Promise.all([
            db.collection('weeklyTests').orderBy('createdAt', 'desc').get(),
            db.collection('dailyTests').orderBy('createdAt', 'desc').get()
        ]);

        const weekly = weeklySnap.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                title: data.title + " (Weekly)",
                examCategories: data.examCategories || [],
                questionPaperId: data.questionPaperId, // Include this
                startTime: normalizeDate(data.createdAt),
                createdAt: normalizeDate(data.createdAt)
            };
        });

        const daily = dailySnap.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                title: data.title + " (Daily)",
                examCategories: data.examCategories || [],
                questionPaperId: data.questionPaperId, // Include this
                startTime: normalizeDate(data.createdAt),
                createdAt: normalizeDate(data.createdAt)
            };
        });

        return { weekly, daily };
    } catch (error) {
        console.error("Error fetching live tests (admin):", error);
        return { weekly: [], daily: [] };
    }
};

/**
 * OPTIMIZED LEADERBOARD FETCHING (ADMIN VERSION)
 * Uses Firebase Admin SDK to bypass client-side auth requirements in Server Components.
 */
export const getUnifiedLeaderboardsAdmin = async (): Promise<{
    topics: Record<UserData['examCategory'], LeaderboardEntry[]>;
    mocks: Record<UserData['examCategory'], LeaderboardEntry[]>;
    daily: Record<UserData['examCategory'], LeaderboardEntry[]>;
    pastWeeklyTests: any[];
    pastDailyTests: any[];
}> => {
    const db = getFirebaseDb();
    if (!db) return { topics: {} as any, mocks: {} as any, daily: {} as any, pastWeeklyTests: [], pastDailyTests: [] };

    try {
        // 2. Fetch history since reset date - Optimized with select and limit
        const historyRef = db.collection('mcqHistory');
        const historySnapshot = await historyRef
            .where('takenAt', '>=', LEADERBOARD_RESET_DATE)
            .select('userId', 'score', 'totalQuestions', 'isMockTest', 'dailyTestId', 'liveTestId', 'takenAt')
            .limit(10000) // Safety limit to prevent 300s timeouts
            .get();
        
        const histories = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MCQHistory));

        // 1. Only fetch users that exist in the histories result to avoid fetching thousands of inactive users
        const activeUserIds = Array.from(new Set(histories.map(h => h.userId))).filter(Boolean);
        const userMap = new Map<string, UserData>();
        
        if (activeUserIds.length > 0) {
            // Fetch users in chunks using db.getAll for better performance and reliability
            for (let i = 0; i < activeUserIds.length; i += 100) {
                const chunkIds = activeUserIds.slice(i, i + 100);
                const userRefs = chunkIds.map(id => db.collection('users').doc(id));
                const usersSnap = await db.getAll(...userRefs);
                
                usersSnap.forEach(doc => {
                    if (doc.exists) {
                        const data = doc.data() as UserData;
                        // Skip admins
                        if (data && data.email && !ADMIN_EMAILS.includes(data.email)) {
                            userMap.set(doc.id, { ...data, uid: doc.id });
                        }
                    }
                });
            }
        }

        // 3. Process Topic and Mock Leaderboards
        const categories: UserData['examCategory'][] = ['MTS', 'POSTMAN', 'PA', 'IP'];
        
        // Pre-fetch daily test IDs to correctly categorize them if they use liveTestId
        const dailyTestsSnap = await db.collection('dailyTests').select('title').get();
        const dailyTestIds = new Set(dailyTestsSnap.docs.map(doc => doc.id));
        
        // Also include IDs matching common daily naming patterns if they are in live_tests
        const liveTestsSnap = await db.collection('live_tests').select('title', 'type').get();
        liveTestsSnap.docs.forEach(doc => {
            const title = doc.data().title || "";
            if (title.toLowerCase().includes("(daily)") || doc.data().type === 'daily') {
                dailyTestIds.add(doc.id);
            }
        });

        const topicCalculations = new Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>();
        const mockCalculations = new Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>();
        const dailyCalculations = new Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>();

        histories.forEach(h => {
            if (!userMap.has(h.userId)) return;
            
            let target: Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>;
            if (h.isMockTest) {
                target = mockCalculations;
            } else if (h.dailyTestId || (h.liveTestId && dailyTestIds.has(h.liveTestId))) {
                target = dailyCalculations;
            } else {
                target = topicCalculations;
            }

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
        const dailyResult = {} as any;
        categories.forEach(cat => {
            topicsResult[cat] = generateLeaderboard(topicCalculations, cat);
            mocksResult[cat] = generateLeaderboard(mockCalculations, cat);
            dailyResult[cat] = generateLeaderboard(dailyCalculations, cat);
        });

        // 4. Fetch Live Tests list
        const liveTests = await getLiveTestsForLeaderboardAdmin();

        return { 
            topics: topicsResult, 
            mocks: mocksResult, 
            daily: dailyResult, 
            pastWeeklyTests: liveTests.weekly,
            pastDailyTests: liveTests.daily
        };
    } catch (error) {
        console.error("Unified leaderboard error (admin):", error);
        return { topics: {} as any, mocks: {} as any, daily: {} as any, pastWeeklyTests: [], pastDailyTests: [] };
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
 * Searches both topicMCQs and syllabusMCQs collections.
 * Supports lookup by topicId AND/OR topicName to bridge the gap between
 * Firestore document IDs and blueprint IDs (e.g., MTS-PB-S1-T1).
 */
export const getTopicMCQsAdmin = async (topicId?: string, topicName?: string): Promise<TopicMCQ[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    
    try {
        const col1 = db.collection('topicMCQs');
        const col2 = db.collection('syllabusMCQs');

        if (topicId || topicName) {
            const promises: Promise<any>[] = [];

            if (topicId) {
                promises.push(col1.where('topicId', '==', topicId).get());
                promises.push(col2.where('topicId', '==', topicId).get());
            }
            if (topicName) {
                promises.push(col1.where('topicName', '==', topicName).get());
                promises.push(col2.where('topicName', '==', topicName).get());
            }

            const snapshots = await Promise.all(promises);

            // Deduplicate by doc ID (topicId and topicName queries may return same doc)
            const resultsMap = new Map<string, any>();
            snapshots.forEach(snap => {
                snap.docs.forEach((doc: any) => {
                    resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
                });
            });

            return Array.from(resultsMap.values()).map(data => ({
                ...data,
                uploadedAt: normalizeDate(data.uploadedAt) || new Date()
            } as TopicMCQ));
        } else {
            // Fetch all
            const [snap1, snap2] = await Promise.all([
                col1.orderBy('uploadedAt', 'desc').get(),
                col2.orderBy('uploadedAt', 'desc').get()
            ]);

            const results = [
                ...snap1.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })),
                ...snap2.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
            ];

            return results.map(data => ({
                ...data,
                uploadedAt: normalizeDate(data.uploadedAt) || new Date()
            } as TopicMCQ));
        }
    } catch (error) {
        console.error("Error in getTopicMCQsAdmin:", error);
        return [];
    }
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

/**
 * Server-side version of getLiveTestLeaderboardData using Firebase Admin SDK.
 * Bypasses client-side permission issues and is more performant.
 */
export const getLiveTestLeaderboardDataAdmin = async (testId: string, questionPaperId?: string): Promise<LeaderboardEntry[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    
    try {
        const historyRef = db.collection('mcqHistory');
        
        // We check across multiple fields in case the ID was saved differently
        const queries = [
            historyRef.where('liveTestId', '==', testId).get(),
            historyRef.where('weeklyTestId', '==', testId).get(),
            historyRef.where('dailyTestId', '==', testId).get()
        ];

        // Also check questionPaperId if provided, as many records use this instead of the test document ID
        if (questionPaperId) {
            queries.push(historyRef.where('questionPaperId', '==', questionPaperId).get());
        }
        
        const snapshots = await Promise.all(queries);
        
        const histories: MCQHistory[] = [];
        snapshots.forEach(snap => {
            snap.docs.forEach(doc => {
                histories.push({ id: doc.id, ...doc.data() } as MCQHistory);
            });
        });

        if (histories.length === 0) return [];

        const userBest = new Map<string, LeaderboardEntry>();
        const allUsers = await getAllUsersAdmin();
        const userMap = new Map(allUsers.map(u => [u.uid, u]));

        histories.forEach(h => {
            const user = userMap.get(h.userId);
            if (!user || user.email && ADMIN_EMAILS.includes(user.email)) return;

            const scorePercent = (h.totalQuestions > 0) ? (h.score / h.totalQuestions) * 100 : 0;
            const existing = userBest.get(h.userId);

            if (!existing || scorePercent > existing.averageScore || (scorePercent === existing.averageScore && (h.durationInSeconds || 99999) < (existing.durationInSeconds || 99999))) {
                userBest.set(h.userId, {
                    userId: h.userId,
                    userName: user.name || "Anonymous",
                    examCategory: user.examCategory,
                    score: h.score,
                    totalQuestions: h.totalQuestions,
                    averageScore: scorePercent,
                    durationInSeconds: h.durationInSeconds,
                    rank: 0
                });
            }
        });

        return Array.from(userBest.values())
            .sort((a, b) => {
                if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
                return (a.durationInSeconds || 99999) - (b.durationInSeconds || 99999);
            })
            .slice(0, 100)
            .map((e, i) => ({ ...e, rank: i + 1 }));
    } catch (e) {
        console.error("Error in getLiveTestLeaderboardDataAdmin:", e);
        return [];
    }
};

export const getQuestionBankDocumentsByCategoryAdmin = async (examCategory: string): Promise<any[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    
    try {
        const snapshot = await db.collection('questionBank')
            .where('examCategory', '==', examCategory)
            .orderBy('uploadedAt', 'desc')
            .get();
            
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data, 
                uploadedAt: normalizeDate(data.uploadedAt) || new Date() 
            };
        });
    } catch (error) {
        console.error("Error fetching question bank by category (admin):", error);
        return [];
    }
};

/**
 * Server-side version of getSyllabi using Firebase Admin SDK.
 */
export const getSyllabiAdmin = async (): Promise<any[]> => {
    const db = getFirebaseDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection('syllabi').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching syllabi (admin):", error);
        return [];
    }
};

