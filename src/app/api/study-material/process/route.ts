
import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase-admin';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import pdf from 'pdf-parse';
import type { Topic, StudyMaterial } from '@/lib/types';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage().bucket(); // Use the default bucket from admin SDK

    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }

    try {
        const { userId, tempFileName, originalFileName, topicName, examCategories } = await request.json();

        if (!userId || !tempFileName || !originalFileName || !examCategories) {
            return NextResponse.json({ error: 'Missing required fields in request.' }, { status: 400 });
        }
        
        // 1. Download the file from the temporary location
        const tempFile = storage.file(`temp-materials/${userId}/${tempFileName}`);
        const [fileBuffer] = await tempFile.download();
        
        // 2. Parse the PDF content
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        // 3. Move file to permanent storage
        const permanentFilePath = `study-materials/${tempFileName}`;
        const permanentFile = storage.file(permanentFilePath);
        await permanentFile.save(fileBuffer, {
            contentType: 'application/pdf',
            public: true, // Make the file publicly readable
        });
        const downloadURL = permanentFile.publicUrl();

        // 4. Delete the temporary file
        await tempFile.delete();

        // 5. Find or create the topic in Firestore
        let topicId: string | null = null;
        let newTopic: Topic | null = null;
        const finalTopicName = topicName || originalFileName.replace(/\.[^/.]+$/, "") || "Untitled Topic";

        const topicsRef = collection(db, 'topics');
        const q = query(topicsRef, where("title", "==", finalTopicName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingTopicDoc = querySnapshot.docs[0];
            topicId = existingTopicDoc.id;
            const topicRef = doc(db, 'topics', topicId);
            await updateDoc(topicRef, { material: textContent });
        } else {
            const newTopicData: Omit<Topic, 'id'> = {
                title: finalTopicName,
                description: "Auto-generated topic from study material upload.",
                icon: 'file-text',
                categoryId: 'uncategorized',
                part: 'Part A',
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
        
        // 6. Create the study material document in Firestore
        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: originalFileName,
            fileType: 'application/pdf',
            content: downloadURL,
            uploadedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialData);
        const newMaterial = { id: docRef.id, ...studyMaterialData };

        return NextResponse.json({
            message: 'File uploaded and processed successfully.',
            newMaterial,
            newTopic
        });

    } catch (error: any) {
        console.error('API Error in process route:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}

    