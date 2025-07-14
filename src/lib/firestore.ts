
import { getFirebaseDb } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, writeBatch, getDoc, DocumentReference, updateDoc, setDoc, orderBy, increment } from 'firebase/firestore';
import type { Category, Topic, UserData, MCQHistory, TopicPerformance } from './types';

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

export const updateUserDocument = async (userId: string, data: Partial<Pick<UserData, 'name' | 'examCategory'>>): Promise<void> => {
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

    const batch = writeBatch(db);
    
    // Add the history document
    const historyRef = doc(collection(db, 'mcqHistory'));
    batch.set(historyRef, historyData);

    // Increment the user's exam count, creating the document if it doesn't exist.
    batch.set(userRef, {
        topicExamsTaken: increment(1)
    }, { merge: true });

    await batch.commit();
};

export const getMCQHistoryForTopic = async (userId: string, topicId: string): Promise<string[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const historyCollection = collection(db, 'mcqHistory');
    const q = query(historyCollection, where('userId', '==', userId), where('topicId', '==', topicId));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return [];
    }

    const allQuestions = querySnapshot.docs.flatMap(doc => doc.data().questions || []);
    return allQuestions;
};


export const getExamHistoryForUser = async (userId: string): Promise<MCQHistory[]> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    
    const historyCollection = collection(db, 'mcqHistory');
    const q = query(historyCollection, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    
    const topics = await getTopics();
    const topicMap = new Map(topics.map(t => [t.id, t]));

    const history = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const topic = topicMap.get(data.topicId);
        
        const takenAt = data.takenAt?.toDate ? data.takenAt.toDate() : new Date();

        return {
            id: doc.id,
            ...data,
            topicTitle: topic?.title || 'Unknown Topic',
            takenAt: takenAt,
        } as MCQHistory;
    });

    return history.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
};

// PERFORMANCE ANALYSIS
export const getPerformanceByTopic = async (userId: string): Promise<TopicPerformance[]> => {
    const allHistory = await getExamHistoryForUser(userId);

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


// CONSOLIDATED DASHBOARD DATA FETCHING
export const getDashboardData = async (userId: string, isAdmin: boolean = false) => {
    // For admin, we don't need userData, just the content
    if (isAdmin) {
        const [categories, topics] = await Promise.all([
            getCategories(),
            getTopics()
        ]);
        return { userData: null, categories, topics };
    }

    // For regular users, fetch everything
    const userDataPromise = getUserData(userId);
    const [userData, categories, topics] = await Promise.all([
        userDataPromise,
        getCategories(),
        getTopics()
    ]);

    // A regular user MUST have a user data document.
    if (!userData) {
         // Instead of throwing an error, return null. The layout will handle this.
        return { userData: null, categories: [], topics: [] };
    }

    return { userData, categories, topics };
}
