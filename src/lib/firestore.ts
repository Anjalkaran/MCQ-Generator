
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
        let paymentStatus = data.paymentStatus || 'free';

        // Check for subscription expiry
        if (paymentStatus === 'paid' && data.paidUntil) {
            const paidUntilDate = new Date(data.paidUntil);
            if (paidUntilDate < new Date()) {
                // Subscription has expired, reset to free
                paymentStatus = 'free';
                // Update in Firestore asynchronously
                updateDoc(userRef, { paymentStatus: 'free' }).catch(err => {
                    console.error("Failed to auto-revert user status to free:", err);
                });
            }
        }

        return {
            uid: userSnap.id,
            ...data,
            paymentStatus,
            topicExamsTaken: data.topicExamsTaken || 0,
            mockTestsTaken: data.mockTestsTaken || 0,
            paidUntil: data.paidUntil || null,
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
    
    let paidUntil = null;
    if (userData.paymentStatus === 'paid') {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        paidUntil = expiryDate.toISOString();
    }
    
    await setDoc(userRef, {
      ...userData,
      paymentStatus: userData.paymentStatus || 'free',
      topicExamsTaken: 0,
      mockTestsTaken: 0,
      paidUntil: paidUntil,
    });
};

export const updateUserDocument = async (userId: string, data: Partial<Pick<UserData, 'name' | 'examCategory' | 'paymentStatus' | 'paidUntil'>>): Promise<void> => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
};

export const updateUserPaymentStatus = async (userId: string, orderId: string) => {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized");
    
    const userRef = doc(db, "users", userId);
    
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    await updateDoc(userRef, {
        paymentStatus: "paid",
        orderId: orderId,
        paidUntil: expiryDate.toISOString(),
    });
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
    const userData = userDoc.data();

    if (!userData) {
        console.error("User not found, cannot save history or increment count.");
        return;
    }

    const batch = writeBatch(db);
    
    // Add the history document
    const historyRef = doc(collection(db, 'mcqHistory'));
    batch.set(historyRef, historyData);

    // Increment the user's exam count only if they are a free user
    if (userData.paymentStatus === 'free') {
        batch.update(userRef, {
            topicExamsTaken: increment(1)
        });
    }

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
    const q = query(historyCollection, where('userId', '==', userId), orderBy('takenAt', 'desc'));
    
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

    return history;
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
