
import { getFirebaseDb } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, writeBatch, getDoc, DocumentReference, updateDoc, setDoc, orderBy, increment, limit, serverTimestamp, Timestamp, arrayUnion, runTransaction } from 'firebase/firestore';
import type { Category, Topic, UserData, MCQHistory, TopicPerformance, BankedQuestion, LeaderboardEntry, UserTopicProgress, QnAUsage, Notification, LiveTest, TopicMCQ, ReasoningQuestion, Feedback, MCQ, MCQData, StudyMaterial } from './types';
import { ADMIN_EMAILS } from './constants';
import { normalizeDate } from './utils';

// USER MANAGEMENT
export const getUserData = async (userId: string): Promise<UserData | null> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            uid: userSnap.id,
            ...data,
            totalExamsTaken: data.totalExamsTaken || 0,
            liveTestsTaken: data.liveTestsTaken || [],
        } as UserData;
    }
    return null;
}

export const getAllUsers = async (): Promise<UserData[]> => {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not initialized");
  const usersCollection = collection(db, 'users');
  const userSnapshot = await getDocs(usersCollection);
  return userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
};

export const createUserDocument = async (userData: Omit<UserData, 'id'>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userData.uid);
    
    await setDoc(userRef, {
      ...userData,
      totalExamsTaken: 0,
      liveTestsTaken: [],
      isPro: false,
      proValidUntil: null,
      lastSeen: serverTimestamp(),
    });
};

export const updateUserDocument = async (userId: string, data: Partial<UserData>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userId);
    
    const updateData: { [key: string]: any } = { ...data };

    if (data.isPro && !data.proValidUntil) {
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
        updateData.proValidUntil = proValidUntil;
    } else if (data.isPro === false) { // Explicitly check for false to handle un-pro-ing a user
        updateData.proValidUntil = null;
    }
    
    // Remove deprecated fields if they are passed in
    delete updateData.topicExamsTaken;
    delete updateData.mockTestsTaken;

    await updateDoc(userRef, updateData);
};


export const deleteUserDocument = async (userId: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not initialized");
  await deleteDoc(doc(db, 'users', userId));
};

// CATEGORY MANAGEMENT
export const getCategories = async (): Promise<Category[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const categoriesCollection = collection(db, 'categories');
    const categorySnapshot = await getDocs(query(categoriesCollection));
    return categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)).sort((a,b) => a.name.localeCompare(b.name));
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'categories'), category);
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const categoryRef = doc(db, "categories", categoryId);
    await updateDoc(categoryRef, data);
};

export const deleteCategory = async (categoryId: string, topicsToDelete: Topic[]): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    
    const batch = writeBatch(db);

    // Delete the category document
    const categoryRef = doc(db, 'categories', categoryId);
    batch.delete(categoryRef);

    // Delete all topics associated with this category
    topicsToDelete.forEach(topic => {
        const topicRef = doc(db, 'topics', topic.id);
        batch.delete(topicRef);
    });

    await batch.commit();
};


// TOPIC MANAGEMENT
export const getTopics = async (): Promise<Topic[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const topicsCollection = collection(db, 'topics');
    const topicSnapshot = await getDocs(query(topicsCollection));
    const topics = topicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
    
    // Fetch category names for topics
    const categories = await getCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    return topics.map(topic => ({
        ...topic,
        categoryName: categoryMap.get(topic.categoryId) || 'N/A'
    })).sort((a,b) => a.title.localeCompare(b.title));
};

export const getTopicsByPartAndExam = async (part: string, examCategory: string): Promise<Topic[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const topicsCollection = collection(db, 'topics');
    const q = query(
        topicsCollection, 
        where('part', '==', part), 
        where('examCategories', 'array-contains', examCategory)
    );
    const topicSnapshot = await getDocs(q);
    const topics = topicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));

    // Fetch category names for topics
    const categories = await getCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
     return topics.map(topic => ({
        ...topic,
        categoryName: categoryMap.get(topic.categoryId) || 'N/A'
    }));
};

export const addTopic = async (topic: Omit<Topic, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'topics'), topic);
};

export const updateTopic = async (topicId: string, data: Partial<Topic>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const topicRef = doc(db, "topics", topicId);
    await updateDoc(topicRef, data);
};

export const deleteTopic = async (topicId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'topics', topicId));
};

// USER TOPIC PROGRESS
export const getUserTopicProgress = async (userId: string, topicId: string): Promise<UserTopicProgress | null> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const progressRef = doc(db, 'users', userId, 'topicProgress', topicId);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
        return progressSnap.data() as UserTopicProgress;
    }
    return null;
}

export const updateUserTopicProgress = async (userId: string, topicId: string, lastCharacterIndexUsed: number): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const progressRef = doc(db, 'users', userId, 'topicProgress', topicId);
    await setDoc(progressRef, { 
        topicId, 
        lastCharacterIndexUsed, 
        updatedAt: new Date() 
    }, { merge: true });
}

// MCQ HISTORY MANAGEMENT
export const saveMCQHistory = async (historyData: Omit<MCQHistory, 'id'>): Promise<string> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const { 
        userId, 
        isMockTest, 
        liveTestId,
        ...restOfData
    } = historyData;

    const dataToSave: { [key: string]: any } = {
        userId,
        isMockTest: isMockTest || false,
        ...restOfData
    };

    if (liveTestId) {
        dataToSave.liveTestId = liveTestId;
    }

    const batch = writeBatch(db);
    const historyRef = doc(collection(db, 'mcqHistory'));
    batch.set(historyRef, dataToSave);
    
    // Only increment exam count if it is NOT a live test
    if (!liveTestId) {
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { totalExamsTaken: increment(1) });
    }
    
    await batch.commit();
    return historyRef.id;
};


export const getAllUserQuestions = async (userId: string): Promise<string[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const history = await getExamHistoryForUser(userId);
    const allQuestions = new Set<string>();
    history.forEach(item => {
        if (Array.isArray(item.questions)) {
            item.questions.forEach(q => allQuestions.add(q));
        }
    });
    return Array.from(allQuestions);
};


export const getExamHistoryForUser = async (userId?: string, historyId?: string): Promise<MCQHistory[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    
    if (historyId) {
        const docRef = doc(db, 'mcqHistory', historyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const takenAt = normalizeDate(data.takenAt) || new Date();
            return [{ id: docSnap.id, ...data, topicTitle: data.topicTitle || 'Mock Test', takenAt } as MCQHistory];
        } else {
            return [];
        }
    }

    if (!userId) {
        throw new Error("User ID is required to fetch history.");
    }

    const historyCollection = collection(db, 'mcqHistory');
    const q = query(historyCollection, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const history: MCQHistory[] = [];
    snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const takenAt = normalizeDate(data.takenAt) || new Date();
        history.push({ id: doc.id, ...data, topicTitle: data.topicTitle || 'Mock Test', takenAt } as MCQHistory);
    });
    history.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    return history;
};

export const getAllExamHistory = async (): Promise<MCQHistory[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const historyCollection = collection(db, 'mcqHistory');
    const snapshot = await getDocs(historyCollection);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, takenAt: normalizeDate(data.takenAt) } as MCQHistory;
    });
};

// PERFORMANCE ANALYSIS
export const getPerformanceByTopic = async (userId: string): Promise<TopicPerformance[]> => {
    const allHistory = await getExamHistoryForUser(userId).then(h => h.filter(item => !item.isMockTest));
    if (allHistory.length === 0) return [];
    const performanceMap = new Map<string, { totalScore: number; totalQuestions: number; attempts: number; topicTitle: string; }>();
    allHistory.forEach(item => {
        const { topicId, topicTitle, score, totalQuestions } = item;
        const existing = performanceMap.get(topicId) || { totalScore: 0, totalQuestions: 0, attempts: 0, topicTitle: topicTitle || 'Unknown Topic' };
        existing.totalScore += score;
        existing.totalQuestions += totalQuestions;
        existing.attempts += 1;
        performanceMap.set(topicId, existing);
    });
    const performanceData: TopicPerformance[] = [];
    performanceMap.forEach((data, topicId) => {
        performanceData.push({
            topicId,
            topicTitle: data.topicTitle,
            attempts: data.attempts,
            averageScore: (data.totalQuestions > 0 ? (data.totalScore / data.totalQuestions) * 100 : 0),
        });
    });
    return performanceData.sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));
};

// QUESTION BANK MANAGEMENT
export const getQuestionBankDocuments = async (examCategory?: 'MTS' | 'POSTMAN' | 'PA'): Promise<BankedQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const bankCollection = collection(db, 'questionBank');
    
    let q;
    if (examCategory) {
        q = query(bankCollection, where('examCategory', '==', examCategory), orderBy('uploadedAt', 'desc'));
    } else {
        q = query(bankCollection, orderBy('uploadedAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as BankedQuestion));
};

export const getQuestionBankDocumentsByCategory = async (examCategory: 'MTS' | 'POSTMAN' | 'PA'): Promise<BankedQuestion[] | null> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const bankCollection = collection(db, 'questionBank');
    const q = query(bankCollection, where('examCategory', '==', examCategory));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as BankedQuestion));
};

export const addQuestionBankDocument = async (data: Omit<BankedQuestion, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'questionBank'), data);
};

export const updateQuestionBankDocument = async (docId: string, content: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'questionBank', docId);
    await updateDoc(docRef, { content });
};

export const deleteQuestionBankDocument = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'questionBank', docId));
};

// LIVE TEST BANK MANAGEMENT
export const getLiveTestBankDocuments = async (): Promise<BankedQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const bankCollection = collection(db, 'liveTestBank');
    const q = query(bankCollection, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as BankedQuestion));
};

export const addLiveTestBankDocument = async (data: Omit<BankedQuestion, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'liveTestBank'), data);
};

export const updateLiveTestBankDocument = async (docId: string, content: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'liveTestBank', docId);
    await updateDoc(docRef, { content });
};


export const deleteLiveTestBankDocument = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'liveTestBank', docId));
};

export const getLiveTestQuestionPaper = async (liveTestId: string): Promise<BankedQuestion | null> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'liveTestBank', liveTestId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return { id: docSnap.id, ...data, uploadedAt: data.uploadedAt.toDate() } as BankedQuestion;
};

export const addLiveTest = async (testData: Omit<LiveTest, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'liveTests'), testData);
};

export const updateLiveTest = async (testId: string, testData: Omit<LiveTest, 'id'>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await updateDoc(doc(db, 'liveTests', testId), testData);
};

export const deleteLiveTest = async (testId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'liveTests', testId));
};

export const getLiveTests = async (fetchAll: boolean = false): Promise<LiveTest[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const testsCollection = collection(db, 'liveTests');
    let q;
    if (fetchAll) {
        q = query(testsCollection, orderBy('startTime', 'desc'));
    } else {
        const now = new Date();
        q = query(testsCollection, where('endTime', '>', now), orderBy('endTime', 'asc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveTest));
};

export const markLiveTestAsTaken = async (userId: string, liveTestId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { liveTestsTaken: arrayUnion(liveTestId) });
};


// LEADERBOARD MANAGEMENT
export const getLeaderboardData = async (examType: 'topic' | 'mock', examCategory: UserData['examCategory']): Promise<LeaderboardEntry[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const isMockTest = examType === 'mock';
    const historyQuery = query(collection(db, 'mcqHistory'), where('isMockTest', '==', isMockTest));
    const historySnapshot = await getDocs(historyQuery);
    const histories = historySnapshot.docs.map(doc => doc.data() as MCQHistory);

    const allUsers = await getAllUsers();
    const filteredUsers = allUsers.filter(u => u.examCategory === examCategory);
    const userMap = new Map(filteredUsers.map(u => [u.uid, u]));

    const userPerformance = new Map<string, { totalScore: number; totalQuestions: number; totalExams: number }>();
    histories.forEach(h => {
        const user = userMap.get(h.userId);
        if (user && !ADMIN_EMAILS.includes(user.email)) {
            const current = userPerformance.get(h.userId) || { totalScore: 0, totalQuestions: 0, totalExams: 0 };
            current.totalScore += h.score;
            current.totalQuestions += h.totalQuestions;
            current.totalExams += 1;
            userPerformance.set(h.userId, current);
        }
    });

    const leaderboard: Omit<LeaderboardEntry, 'rank'>[] = [];
    userPerformance.forEach((perf, userId) => {
        const user = userMap.get(userId);
        if (user && perf.totalExams > 6) {
            leaderboard.push({
                userId,
                userName: user.name,
                examCategory: user.examCategory,
                averageScore: (perf.totalQuestions > 0) ? (perf.totalScore / perf.totalQuestions) * 100 : 0,
                totalExams: perf.totalExams,
            });
        }
    });

    return leaderboard.sort((a, b) => b.averageScore - a.averageScore).map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export const getLiveTestsForLeaderboard = async (): Promise<LiveTest[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const now = new Date();
    // Fetch all tests that have started
    const q = query(collection(db, 'liveTests'), where('startTime', '<=', now), orderBy('startTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            startTime: normalizeDate(data.startTime),
            endTime: normalizeDate(data.endTime),
        } as LiveTest;
    });
};

export const getLiveTestLeaderboardData = async (liveTestId: string): Promise<LeaderboardEntry[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'mcqHistory'), where('liveTestId', '==', liveTestId));
    const historySnapshot = await getDocs(q);
    const histories = historySnapshot.docs.map(doc => doc.data() as MCQHistory);

    const userIds = [...new Set(histories.map(h => h.userId))];
    if (userIds.length === 0) return [];
    
    const allUsers = await getAllUsers();
    const userMap = new Map(allUsers.map(u => [u.uid, u]));
    
    let leaderboard: Omit<LeaderboardEntry, 'rank'>[] = [];
    histories.forEach(h => {
        const user = userMap.get(h.userId);
        if (user && !ADMIN_EMAILS.includes(user.email)) {
            leaderboard.push({
                userId: h.userId,
                userName: user.name,
                examCategory: user.examCategory,
                score: h.score,
                totalQuestions: h.totalQuestions,
                averageScore: (h.totalQuestions > 0) ? (h.score / h.totalQuestions) * 100 : 0,
                durationInSeconds: h.durationInSeconds,
            });
        }
    });
    
    const sortedLeaderboard = leaderboard
        .sort((a, b) => {
            if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
            return (a.durationInSeconds || Infinity) - (b.durationInSeconds || Infinity);
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return sortedLeaderboard;
};


// NOTIFICATION MANAGEMENT
export const addAdminNotification = async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await addDoc(collection(db, 'notifications'), { ...notification, createdAt: new Date(), isRead: false });
};

export const getAdminNotifications = async (): Promise<Notification[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Notification));
};

export const markNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
        batch.update(doc(db, 'notifications', id), { isRead: true });
    });
    await batch.commit();
};

// TOPIC MCQ MANAGEMENT
export const getTopicMCQs = async (topicId?: string): Promise<TopicMCQ[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const q = topicId ? query(collection(db, 'topicMCQs'), where('topicId', '==', topicId)) : query(collection(db, 'topicMCQs'), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as TopicMCQ));
};

/**
 * Shuffles an array in place.
 * @param array The array to shuffle.
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const getShuffledMCQsForTopics = async (
    fixedRequests: Map<string, number>,
    randomRequest: { topics: string[], questions: number } | null,
    examCategory: 'MTS' | 'POSTMAN' | 'PA',
    allMcqsForCategory: (MCQ & { sourceDocId: string; topicId: string })[]
): Promise<(MCQ & { sourceDocId: string })[]> => {

    const mcqsByTopicId = new Map<string, (MCQ & { sourceDocId: string })[]>();

    allMcqsForCategory.forEach(mcq => {
        const existing = mcqsByTopicId.get(mcq.topicId) || [];
        mcqsByTopicId.set(mcq.topicId, [...existing, mcq]);
    });

    const finalMCQs: (MCQ & { sourceDocId: string })[] = [];
    const usedQuestions = new Set<string>();

    for (const [topicId, count] of fixedRequests.entries()) {
        const availableMCQs = (mcqsByTopicId.get(topicId) || []).filter(mcq => !usedQuestions.has(mcq.question));
        if (availableMCQs.length < count) {
            console.warn(`Not enough questions for topic ID ${topicId}. Needed ${count}, found ${availableMCQs.length}.`);
        }
        const questionsToTake = shuffleArray(availableMCQs).slice(0, count);
        questionsToTake.forEach(q => usedQuestions.add(q.question));
        finalMCQs.push(...questionsToTake);
    }

    if (randomRequest) {
        let pooledMCQs: (MCQ & { sourceDocId: string })[] = [];
        randomRequest.topics.forEach(topicId => {
            pooledMCQs.push(...(mcqsByTopicId.get(topicId) || []));
        });
        const availablePooled = pooledMCQs.filter(mcq => !usedQuestions.has(mcq.question));
         if (availablePooled.length < randomRequest.questions) {
            console.warn(`Not enough questions for random pool. Needed ${randomRequest.questions}, found ${availablePooled.length}.`);
        }
        const questionsToTake = shuffleArray(availablePooled).slice(0, randomRequest.questions);
        questionsToTake.forEach(q => usedQuestions.add(q.question));
        finalMCQs.push(...questionsToTake);
    }

    return finalMCQs;
};


export const addTopicMCQDocument = async (data: Omit<TopicMCQ, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'topicMCQs'), data);
};

export const updateTopicMCQDocument = async (docId: string, content: string, fileName?: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'topicMCQs', docId);
    const updateData: { content: string, fileName?: string, uploadedAt: Date } = { content, uploadedAt: new Date() };
    if (fileName) {
        updateData.fileName = fileName;
    }
    await updateDoc(docRef, updateData);
};


export const updateTopicMCQWithTranslation = async (docId: string, originalQuestion: string, lang: string, translatedMcq: MCQ): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'topicMCQs', docId);

    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists()) {
                throw "Document does not exist!";
            }

            const data = docSnap.data();
            let content;
            try {
                content = JSON.parse(data.content);
            } catch (e) {
                console.error("Failed to parse existing content as JSON");
                return; // Or handle non-JSON content
            }
            
            if (!content.mcqs || !Array.isArray(content.mcqs)) {
                return; // No mcqs array to update
            }

            const questionIndex = content.mcqs.findIndex((q: MCQ) => q.question === originalQuestion);
            if (questionIndex === -1) {
                console.warn("Original question not found in document, cannot save translation.");
                return;
            }
            
            if (!content.mcqs[questionIndex].translations) {
                content.mcqs[questionIndex].translations = {};
            }
            
            content.mcqs[questionIndex].translations[lang] = translatedMcq;

            transaction.update(docRef, { content: JSON.stringify(content, null, 2) });
        });
        console.log(`Translation for '${originalQuestion.substring(0,30)}...' cached in ${lang}.`);
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw error;
    }
};


export const deleteTopicMCQDocument = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'topicMCQs', docId));
};

// REASONING BANK MANAGEMENT
export const getReasoningQuestions = async (): Promise<ReasoningQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'reasoningBank'), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as ReasoningQuestion));
};

export const getReasoningQuestionsForLiveTest = async (examCategory: 'MTS' | 'POSTMAN' | 'PA'): Promise<ReasoningQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const allTopics = await getTopics();

    // Find topic titles that are for non-verbal reasoning for the specified exam category
    const relevantTopicTitles = allTopics
        .filter(t => 
            (t.categoryName?.toLowerCase().includes("reasoning") || 
             t.categoryName?.toLowerCase().includes("non-verbal")) &&
            t.examCategories.includes(examCategory)
        )
        .map(t => t.title);
        
    if (relevantTopicTitles.length === 0) return [];

    const q = query(
        collection(db, 'reasoningBank'), 
        where('isForLiveTest', '==', true),
        where('topic', 'in', relevantTopicTitles)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as ReasoningQuestion));
};

export const getReasoningQuestionsForPartwiseTest = async (
  nonVerbalTopicRequests: { name: string, questions: number }[]
): Promise<ReasoningQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const allFetchedQuestions: ReasoningQuestion[] = [];
    const reasoningBankRef = collection(db, 'reasoningBank');

    for (const request of nonVerbalTopicRequests) {
        const q = query(reasoningBankRef, where('topic', '==', request.name));
        const snapshot = await getDocs(q);
        
        const availableQuestions = snapshot.docs.map(doc => doc.data() as ReasoningQuestion);
        
        if (availableQuestions.length < request.questions) {
            console.warn(`Not enough questions for reasoning topic "${request.name}". Needed ${request.questions}, found ${availableQuestions.length}.`);
        }

        const selected = shuffleArray(availableQuestions).slice(0, request.questions);
        allFetchedQuestions.push(...selected);
    }

    return allFetchedQuestions;
};


export const addReasoningQuestion = async (data: Omit<ReasoningQuestion, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'reasoningBank'), data);
};

export const updateReasoningQuestion = async (docId: string, data: Partial<Omit<ReasoningQuestion, 'id' | 'uploadedAt'>>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'reasoningBank', docId);
    await updateDoc(docRef, data);
};


export const deleteReasoningQuestion = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'reasoningBank', docId));
};

// FEEDBACK MANAGEMENT
export const getAllFeedback = async (): Promise<Feedback[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const feedbackCollection = collection(db, 'feedback');
    const q = query(feedbackCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate()
        } as Feedback;
    });
};

export const hasUserSubmittedFeedback = async (userId: string): Promise<boolean> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const feedbackCollection = collection(db, 'feedback');
    const q = query(feedbackCollection, where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};

export const replyToFeedback = async (feedbackId: string, reply: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const feedbackRef = doc(db, 'feedback', feedbackId);
    await updateDoc(feedbackRef, { reply, repliedAt: new Date() });
};

// STUDY MATERIAL MANAGEMENT
export const getStudyMaterials = async (): Promise<StudyMaterial[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const materialsCollection = collection(db, 'studyMaterials');
    const q = query(materialsCollection, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as StudyMaterial));
};

export const addStudyMaterial = async (data: Omit<StudyMaterial, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'studyMaterials'), data);
};

export const deleteStudyMaterial = async (materialId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'studyMaterials', materialId));
};


// CONSOLIDATED DASHBOARD DATA FETCHING
export const getDashboardData = async (userId: string, isAdmin: boolean = false) => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    if (isAdmin) {
        const [categories, topics, bankedQuestions, liveTestBank, qnaUsage, notifications, topicMCQs, studyMaterials] = await Promise.all([
            getCategories(), 
            getTopics(), 
            getQuestionBankDocuments(), 
            getLiveTestBankDocuments(), 
            getQnAUsage(), 
            getAdminNotifications(), 
            getTopicMCQs(),
            getStudyMaterials()
        ]);
        return { userData: null, categories, topics, bankedQuestions, liveTestBank, qnaUsage, notifications, topicMCQs, studyMaterials };
    }

    const [userData, allCategories, allTopics, allBankedQuestions, allStudyMaterials] = await Promise.all([
        getUserData(userId), getCategories(), getTopics(), getQuestionBankDocuments(), getStudyMaterials()
    ]);
    
    if (!userData) {
        // Return a default structure to avoid crashing the app if user data is somehow missing.
        return { userData: null, categories: [], topics: [], bankedQuestions: [], liveTestBank: [], qnaUsage: [], notifications: [], topicMCQs: [], studyMaterials: [] };
    }

    // Filter categories, topics, and banked questions based on the user's exam category
    const userExamCategory = userData.examCategory;
    
    const userCategories = allCategories.filter(c => c.examCategories && c.examCategories.includes(userExamCategory));
    const userCategoryIds = new Set(userCategories.map(c => c.id));
    
    const userTopics = allTopics.filter(t => 
        t.examCategories && t.examCategories.includes(userExamCategory) && userCategoryIds.has(t.categoryId)
    );
    
    const userBankedQuestions = allBankedQuestions.filter(bq => bq.examCategory === userExamCategory);
    
    const userStudyMaterials = allStudyMaterials.filter(sm => sm.examCategories && sm.examCategories.includes(userExamCategory));

    return { userData, categories: userCategories, topics: userTopics, bankedQuestions: userBankedQuestions, liveTestBank: [], qnaUsage: [], notifications: [], topicMCQs: [], studyMaterials: userStudyMaterials };
};


// ANALYTICS
export const logQnAUSage = async (userId: string, topic: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await addDoc(collection(db, 'qnaUsage'), { userId, topic, timestamp: new Date() });
};

export const getQnAUsage = async (): Promise<QnAUsage[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const snapshot = await getDocs(collection(db, 'qnaUsage'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate() } as QnAUsage));
};

export const getUserLanguagePreferences = async (): Promise<{ userId: string; name: string; email: string; preferredLanguage: string; }[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const [allUsers, allHistory] = await Promise.all([
        getAllUsers(),
        getAllExamHistory(),
    ]);

    const historyByUser = new Map<string, MCQHistory[]>();
    for (const historyItem of allHistory) {
        const userHistory = historyByUser.get(historyItem.userId) || [];
        userHistory.push(historyItem);
        historyByUser.set(historyItem.userId, userHistory);
    }

    const preferences: { userId: string; name: string; email: string; preferredLanguage: string; }[] = [];

    for (const user of allUsers) {
        if (ADMIN_EMAILS.includes(user.email)) continue;

        const userHistory = historyByUser.get(user.uid) || [];
        if (userHistory.length === 0) {
            preferences.push({
                userId: user.uid,
                name: user.name,
                email: user.email,
                preferredLanguage: 'N/A',
            });
            continue;
        }

        const langCounts: Record<string, number> = {};
        for (const item of userHistory) {
            const lang = item.language || 'English';
            langCounts[lang] = (langCounts[lang] || 0) + 1;
        }

        let preferredLanguage = 'N/A';
        let maxCount = 0;
        for (const [lang, count] of Object.entries(langCounts)) {
            if (count > maxCount) {
                preferredLanguage = lang;
                maxCount = count;
            }
        }
        
        preferences.push({
            userId: user.uid,
            name: user.name,
            email: user.email,
            preferredLanguage,
        });
    }

    return preferences.sort((a,b) => a.name.localeCompare(b.name));
};


// GENERATED QUIZ MANAGEMENT
export const getGeneratedQuiz = async (quizId: string): Promise<MCQData | null> => {
    const db = getFirebaseDb();
    if (!db) return null;
    const docRef = doc(db, 'generatedQuizzes', quizId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as MCQData;
    }
    return null;
}
