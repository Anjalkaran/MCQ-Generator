

import { getFirebaseDb } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, writeBatch, getDoc, DocumentReference, updateDoc, setDoc, orderBy, increment, limit } from 'firebase/firestore';
import type { Category, Topic, UserData, MCQHistory, TopicPerformance, BankedQuestion } from './types';
import { ADMIN_EMAIL } from './constants';

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
    });
};

export const updateUserDocument = async (userId: string, data: Partial<Pick<UserData, 'name' | 'examCategory' | 'isPro'>>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
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

// MCQ HISTORY MANAGEMENT
export const saveMCQHistory = async (historyData: Omit<MCQHistory, 'id'>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', historyData.userId);
    const userDoc = await getDoc(userRef);

    const batch = writeBatch(db);
    
    const historyRef = doc(collection(db, 'mcqHistory'));
    batch.set(historyRef, historyData);

    if (userDoc.exists() && userDoc.data()?.email !== ADMIN_EMAIL) {
        if (historyData.isMockTest) {
            batch.update(userRef, { mockTestsTaken: increment(1) });
        } else {
            batch.update(userRef, { topicExamsTaken: increment(1) });
        }
    }

    await batch.commit();
};

export const getAllUserQuestions = async (userId: string): Promise<string[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");

    const history = await getExamHistoryForUser(userId);

    // Limit to the most recent 15 exams to avoid overly large prompts.
    const recentHistory = history.slice(0, 15);

    const allQuestions = new Set<string>();
    recentHistory.forEach(item => {
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
    
    // Create two separate queries that Firestore can handle without a custom index.
    const mockTestQuery = query(
        historyCollection, 
        where('userId', '==', userId), 
        where('isMockTest', '==', true)
    );
    const topicExamQuery = query(
        historyCollection, 
        where('userId', '==', userId),
        where('isMockTest', '==', false)
    );

    const [mockTestSnapshot, topicExamSnapshot] = await Promise.all([
        getDocs(mockTestQuery),
        getDocs(topicExamQuery),
    ]);
    
    const history: MCQHistory[] = [];

    const processSnapshot = (snapshot: any) => {
        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            const takenAt = data.takenAt?.toDate ? data.takenAt.toDate() : new Date();
            
            history.push({
                id: doc.id,
                ...data,
                topicTitle: data.topicTitle || 'Mock Test',
                takenAt: takenAt,
            } as MCQHistory);
        });
    };

    processSnapshot(mockTestSnapshot);
    processSnapshot(topicExamSnapshot);

    // Sort the combined results in-memory
    history.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());

    return history;
};

// PERFORMANCE ANALYSIS
export const getPerformanceByTopic = async (userId: string): Promise<TopicPerformance[]> => {
    const allHistory = await getExamHistoryForUser(userId).then(h => h.filter(item => !item.isMockTest));

    if (allHistory.length === 0) {
        return [];
    }

    const performanceMap = new Map<string, { totalScore: number; totalQuestions: number; attempts: number; topicTitle: string; }>();

    allHistory.forEach(item => {
        const { topicId, topicTitle, score, totalQuestions } = item;

        if (performanceMap.has(topicId)) {
            const existing = performanceMap.get(topicId)!;
            existing.totalScore += score;
            existing.totalQuestions += totalQuestions;
            existing.attempts += 1;
        } else {
            performanceMap.set(topicId, {
                totalScore: score,
                totalQuestions: totalQuestions,
                attempts: 1,
                topicTitle: topicTitle || 'Unknown Topic',
            });
        }
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
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            uploadedAt: data.uploadedAt.toDate(), // Convert Firestore Timestamp to JS Date
        } as BankedQuestion
    });
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

export const getQuestionBankByCategory = async (examCategory: string): Promise<string> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const bankCollection = collection(db, 'questionBank');
    const q = query(bankCollection, where('examCategory', '==', examCategory));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return "";
    }

    // Combine content from all matching documents
    const allContent = querySnapshot.docs.map(doc => doc.data().content).join('\n\n---\n\n');
    return allContent;
};


// CONSOLIDATED DASHBOARD DATA FETCHING
export const getDashboardData = async (userId: string, isAdmin: boolean = false) => {
    const [categories, topics, bankedQuestions] = await Promise.all([
        getCategories(),
        getTopics(),
        isAdmin ? getQuestionBankDocuments() : [],
    ]);
    
    if (isAdmin) {
        return { userData: null, categories, topics, bankedQuestions };
    }

    const userData = await getUserData(userId);
    if (!userData) {
        return { userData: null, categories: [], topics: [], bankedQuestions: [] };
    }

    return { userData, categories, topics, bankedQuestions };
}
