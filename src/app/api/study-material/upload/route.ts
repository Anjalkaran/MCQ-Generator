
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase-admin';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import type { Topic, StudyMaterial } from '@/lib/types';

export async function POST(request: Request) {
    const db = getFirebaseDb();
    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }

    try {
        const { topicName, examCategories, downloadURL, textContent, fileName, fileType } = await request.json();

        if (!fileName || !fileType || !downloadURL || !examCategories || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields in request.' }, { status: 400 });
        }

        // 1. Find or create the topic in Firestore
        let topicId: string | null = null;
        let newTopic: Topic | null = null;
        const finalTopicName = topicName || fileName.replace(/\.[^/.]+$/, "") || "Untitled Topic";

        const topicsRef = collection(db, 'topics');
        const q = query(topicsRef, where("title", "==", finalTopicName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingTopicDoc = querySnapshot.docs[0];
            topicId = existingTopicDoc.id;
            const topicRef = doc(db, 'topics', topicId);
            const existingData = existingTopicDoc.data() as Topic;
            const updatedCategories = Array.from(new Set([...existingData.examCategories, ...examCategories]));
            
            // Update categories and append new material text
            const updatedMaterial = (existingData.material || "") + "\n\n" + textContent;
            await updateDoc(topicRef, { examCategories: updatedCategories, material: updatedMaterial });

        } else {
            const newTopicData: Omit<Topic, 'id'> = {
                title: finalTopicName,
                description: "Auto-generated topic from study material upload.",
                icon: 'file-text',
                categoryId: 'uncategorized', 
                part: 'Part A', // Default part
                examCategories: examCategories,
                material: textContent
            };
            const topicRef = await addDoc(collection(db, 'topics'), newTopicData);
            topicId = topicRef.id;
            newTopic = { id: topicId, ...newTopicData };
        }
        
        if (!topicId) {
            throw new Error('Failed to find or create a topic.');
        }
        
        // 2. Create the study material document in Firestore
        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: fileName,
            fileType: fileType,
            content: downloadURL,
            uploadedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialData);
        const newMaterial = { id: docRef.id, ...studyMaterialData };

        return NextResponse.json({
            message: 'File processed successfully.',
            newMaterial,
            newTopic
        });

    } catch (error: any) {
        console.error('API Error in upload route:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
