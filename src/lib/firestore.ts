
import { getFirebaseDb } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, writeBatch, getDoc, DocumentReference, updateDoc, setDoc, orderBy, increment, limit, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore';
import type { Category, Topic, UserData, MCQHistory, TopicPerformance, BankedQuestion, LeaderboardEntry, UserTopicProgress, QnAUsage, Notification, LiveTest, TopicMCQ, ReasoningQuestion } from './types';
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
            topicExamsTaken: data.topicExamsTaken || 0,
            mockTestsTaken: data.mockTestsTaken || 0,
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
      topicExamsTaken: 0,
      mockTestsTaken: 0,
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
    
    const updateData: Partial<UserData> = { ...data };

    if (data.isPro && !data.proValidUntil) {
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
        updateData.proValidUntil = proValidUntil;
    } else if (data.isPro === false) { // Explicitly check for false to handle un-pro-ing a user
        updateData.proValidUntil = null;
    }
    
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
    return topicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
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

export const addMaterialToTopic = async (topicId: string, material: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const topicRef = doc(db, 'topics', topicId);
    await updateDoc(topicRef, { material });
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
export const saveMCQHistory = async (historyData: Omit<MCQHistory, 'id'>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const { 
        userId, 
        isMockTest, 
        score, 
        totalQuestions, 
        questions, 
        topicId, 
        topicTitle, 
        liveTestId, 
        durationInSeconds 
    } = historyData;

    const dataToSave: { [key: string]: any } = {
        userId,
        score,
        totalQuestions,
        questions: questions || [],
        isMockTest: isMockTest || false,
        topicId: topicId || (isMockTest ? 'mock_test' : 'unknown_topic'),
        topicTitle: topicTitle || (isMockTest ? 'Mock Test' : 'Quiz'),
        takenAt: serverTimestamp(),
    };

    if (liveTestId) dataToSave.liveTestId = liveTestId;
    if (durationInSeconds !== undefined && durationInSeconds !== null) dataToSave.durationInSeconds = durationInSeconds;
    
    const batch = writeBatch(db);
    const historyRef = doc(collection(db, 'mcqHistory'));
    batch.set(historyRef, dataToSave);

    const userRef = doc(db, 'users', userId);
    const updateData = isMockTest ? { mockTestsTaken: increment(1) } : { topicExamsTaken: increment(1) };
    batch.update(userRef, updateData);
    
    await batch.commit();
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


export const getExamHistoryForUser = async (userId: string): Promise<MCQHistory[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const historyCollection = collection(db, 'mcqHistory');
    const q = query(historyCollection, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const history: MCQHistory[] = [];
    snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const takenAt = data.takenAt?.toDate ? data.takenAt.toDate() : new Date();
        history.push({ id: doc.id, ...data, topicTitle: data.topicTitle || 'Mock Test', takenAt } as MCQHistory);
    });
    history.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    return history;
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
export const getQuestionBankDocuments = async (): Promise<BankedQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const bankCollection = collection(db, 'questionBank');
    const q = query(bankCollection, orderBy('uploadedAt', 'desc'));
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
        if (user && perf.totalExams > 5) {
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
    const q = query(collection(db, 'liveTests'), where('endTime', '<', now), orderBy('endTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveTest));
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

    const topPerformer = sortedLeaderboard[0];
    if (topPerformer) {
        const winnerData = userMap.get(topPerformer.userId);
        const proValidUntilDate = normalizeDate(winnerData?.proValidUntil);
        const isPro = !!(winnerData?.isPro && proValidUntilDate && proValidUntilDate > new Date());
        if (winnerData && !isPro) {
            await updateUserDocument(winnerData.uid, { isPro: true });
        }
    }
    
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

export const addTopicMCQDocument = async (data: Omit<TopicMCQ, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const existingDocs = await getTopicMCQs(data.topicId);
    if (existingDocs.length > 0) {
        const existingDoc = existingDocs[0];
        const newContent = existingDoc.content + '\n\n---\n\n' + data.content;
        const docRef = doc(db, 'topicMCQs', existingDoc.id);
        await updateDoc(docRef, { content: newContent, fileName: data.fileName, uploadedAt: data.uploadedAt });
        return docRef;
    } else {
        return await addDoc(collection(db, 'topicMCQs'), data);
    }
};

export const updateTopicMCQDocument = async (docId: string, content: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'topicMCQs', docId);
    await updateDoc(docRef, { content });
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
    const q = query(
        collection(db, 'reasoningBank'), 
        where('isForLiveTest', '==', true),
        where('examCategories', 'array-contains', examCategory)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as ReasoningQuestion));
};


export const addReasoningQuestion = async (data: Omit<ReasoningQuestion, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'reasoningBank'), data);
};

export const deleteReasoningQuestion = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'reasoningBank', docId));
};


// CONSOLIDATED DASHBOARD DATA FETCHING
export const getDashboardData = async (userId: string, isAdmin: boolean = false) => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    if (isAdmin) {
        const [categories, topics, bankedQuestions, liveTestBank, qnaUsage, notifications, topicMCQs] = await Promise.all([
            getCategories(), getTopics(), getQuestionBankDocuments(), getLiveTestBankDocuments(), getQnAUsage(), getAdminNotifications(), getTopicMCQs()
        ]);
        return { userData: null, categories, topics, bankedQuestions, liveTestBank, qnaUsage, notifications, topicMCQs };
    }

    const [userData, categories, topics] = await Promise.all([ getUserData(userId), getCategories(), getTopics() ]);
    if (!userData) {
        return { userData: null, categories: [], topics: [], bankedQuestions: [], liveTestBank: [], qnaUsage: [], notifications: [], topicMCQs: [] };
    }
    return { userData, categories, topics, bankedQuestions: [], liveTestBank: [], qnaUsage: [], notifications: [], topicMCQs: [] };
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
