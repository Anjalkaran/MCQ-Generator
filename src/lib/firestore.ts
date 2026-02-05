import { getFirebaseDb, getFirebaseAuth } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, writeBatch, getDoc, DocumentReference, updateDoc, setDoc, orderBy, increment, limit, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore';
import type { Category, Topic, UserData, MCQHistory, TopicPerformance, BankedQuestion, LeaderboardEntry, QnAUsage, Notification, LiveTest, TopicMCQ, ReasoningQuestion, Feedback, VideoClass, StudyMaterial, AptiSolveLaunch } from './types';
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
            completedMockBankTests: data.completedMockBankTests || [],
        } as UserData;
    }

    // Recovery Logic: If user is authenticated via Firebase Auth but has no document in Firestore.
    // This happens if the registration process was interrupted.
    const auth = getFirebaseAuth();
    if (auth && auth.currentUser && auth.currentUser.uid === userId) {
        const newUser: UserData = {
            uid: userId,
            name: auth.currentUser.displayName || 'New User',
            email: auth.currentUser.email || '',
            examCategory: 'MTS', // Default fallback category
            totalExamsTaken: 0,
            isPro: true, // Default to true for recovery users
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
        };
        await setDoc(userRef, newUser);
        return newUser;
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

export const getOnlineUsers = async (): Promise<UserData[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('lastSeen', '>', twoMinutesAgo));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
};

export const createUserDocument = async (userData: Omit<UserData, 'id'>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userData.uid);
    
    await setDoc(userRef, {
      ...userData,
      totalExamsTaken: 0,
      liveTestsTaken: [],
      isPro: true,
      proValidUntil: null,
      lastSeen: serverTimestamp(),
    });
};

export const updateUserDocument = async (userId: string, data: Partial<UserData>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userId);
    
    const updateData: { [key: string]: any } = { ...data };
    
    if (data.proValidUntil && data.proValidUntil instanceof Date) {
        updateData.proValidUntil = Timestamp.fromDate(data.proValidUntil);
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
    const categoryRef = doc(db, 'categories', categoryId);
    batch.delete(categoryRef);

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

// MCQ HISTORY MANAGEMENT
export const saveMCQHistory = async (historyData: Omit<MCQHistory, 'id'>): Promise<string> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const { 
        userId, 
        isMockTest, 
        liveTestId,
        questionPaperId,
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
    if (questionPaperId) {
        dataToSave.questionPaperId = questionPaperId;
    }

    const batch = writeBatch(db);
    const historyRef = doc(collection(db, 'mcqHistory'));
    batch.set(historyRef, dataToSave);
    
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { totalExamsTaken: increment(1) });
    
    if (questionPaperId) {
        batch.update(userRef, { completedMockBankTests: arrayUnion(questionPaperId) });
    }
    
    await batch.commit();
    return historyRef.id;
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

    if (!userId) throw new Error("User ID is required to fetch history.");

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
    const allHistory = await getExamHistoryForUser(userId);
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
export const getQuestionBankDocuments = async (examCategory?: UserData['examCategory']): Promise<BankedQuestion[]> => {
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

export const addQuestionBankDocument = async (data: Omit<BankedQuestion, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'questionBank'), data);
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

export const getLiveTestsForLeaderboard = async (): Promise<LiveTest[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const testsCollection = collection(db, 'liveTests');
    const now = new Date();
    const q = query(testsCollection, where('endTime', '<=', now), orderBy('endTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        startTime: normalizeDate(doc.data().startTime),
        endTime: normalizeDate(doc.data().endTime)
    } as any));
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
        const hasTakenEnoughExams = user?.examCategory === 'IP' ? perf.totalExams > 0 : (user?.totalExamsTaken || 0) > 6;

        if (user && hasTakenEnoughExams) {
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

export const deleteTopicMCQDocument = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'topicMCQs', docId));
};

export const updateTopicMCQDocument = async (docId: string, content: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const docRef = doc(db, 'topicMCQs', docId);
    await updateDoc(docRef, { content, uploadedAt: new Date() });
};

// REASONING BANK MANAGEMENT
export const getReasoningQuestions = async (): Promise<ReasoningQuestion[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'reasoningBank'), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as ReasoningQuestion));
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

// VIDEO CLASS MANAGEMENT
export const getVideoClasses = async (): Promise<VideoClass[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const videosCollection = collection(db, 'videoClasses');
    const q = query(videosCollection, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as VideoClass));
};

export const addVideoClass = async (data: Omit<VideoClass, 'id'>): Promise<DocumentReference> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    return await addDoc(collection(db, 'videoClasses'), data);
};

export const updateVideoClass = async (videoId: string, data: Partial<Omit<VideoClass, 'id'>>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const videoRef = doc(db, 'videoClasses', videoId);
    await updateDoc(videoRef, data);
};

export const deleteVideoClass = async (videoId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'videoClasses', videoId));
};

// STUDY MATERIAL MANAGEMENT
export const getStudyMaterials = async (topicId?: string): Promise<StudyMaterial[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const q = topicId 
        ? query(collection(db, 'studyMaterials'), where('topicId', '==', topicId), orderBy('uploadedAt', 'desc'))
        : query(collection(db, 'studyMaterials'), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), uploadedAt: doc.data().uploadedAt.toDate() } as StudyMaterial));
};

export const deleteStudyMaterial = async (docId: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'studyMaterials', docId));
};

// CONSOLIDATED DASHBOARD DATA FETCHING
export const getDashboardData = async (userId: string) => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const userData = await getUserData(userId);
    if (!userData) {
        return { userData: null, categories: [], topics: [], videoClasses: [], studyMaterials: [], notifications: [] };
    }

    const isAdmin = ADMIN_EMAILS.includes(userData.email);
    const notificationsPromise = isAdmin ? getAdminNotifications() : Promise.resolve([]);

    const [allCategories, allTopics, allVideoClasses, allStudyMaterials, notifications] = await Promise.all([
        getCategories(), 
        getTopics(), 
        getVideoClasses(), 
        getStudyMaterials(),
        notificationsPromise
    ]);

    if (isAdmin) {
        return { 
            userData, 
            categories: allCategories, 
            topics: allTopics, 
            videoClasses: allVideoClasses, 
            studyMaterials: allStudyMaterials, 
            notifications 
        };
    }

    const userExamCategory = userData.examCategory;
    const userCategories = allCategories.filter(c => c.examCategories && c.examCategories.includes(userExamCategory));
    const userTopics = allTopics.filter(t => t.examCategories && t.examCategories.includes(userExamCategory));
    const userVideoClasses = allVideoClasses.filter(vc => vc.examCategories && vc.examCategories.includes(userExamCategory));
    const userTopicIds = new Set(userTopics.map(t => t.id));
    const userStudyMaterials = allStudyMaterials.filter(sm => userTopicIds.has(sm.topicId));

    return { userData, categories: userCategories, topics: userTopics, videoClasses: userVideoClasses, studyMaterials: userStudyMaterials, notifications };
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
            preferences.push({ userId: user.uid, name: user.name, email: user.email, preferredLanguage: 'N/A' });
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
        
        preferences.push({ userId: user.uid, name: user.name, email: user.email, preferredLanguage });
    }

    return preferences.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
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
    const localQuiz = localStorage.getItem(`quiz-${quizId}`);
    if (localQuiz) {
        return JSON.parse(localQuiz);
    }
    return null;
}

// APTISOLVE LAUNCH TRACKING
export const logAptiSolveLaunch = async (userId: string, userName: string, userEmail: string): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    await addDoc(collection(db, 'aptiSolveLaunches'), { 
        userId,
        userName,
        userEmail,
        launchedAt: serverTimestamp() 
    });
};

export const getAptiSolveLaunches = async (): Promise<AptiSolveLaunch[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const snapshot = await getDocs(query(collection(db, 'aptiSolveLaunches'), orderBy('launchedAt', 'desc')));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            launchedAt: normalizeDate(data.launchedAt) || new Date()
        } as AptiSolveLaunch;
    });
};
