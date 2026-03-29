
import { getFirebaseDb } from './firebase-admin';
import type { TopicMCQ, MCQHistory } from './types';
import { normalizeDate } from './utils';

/**
 * Server-side version of getTopics using Firebase Admin SDK.
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
