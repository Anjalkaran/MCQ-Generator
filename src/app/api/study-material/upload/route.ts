
import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase-admin';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import pdf from 'pdf-parse';
import type { Topic, StudyMaterial } from '@/lib/types';

export async function POST(request: Request) {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage();
    const bucket = storage.bucket();

    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const topicName = formData.get('topicName') as string;
        const examCategories = formData.getAll('examCategories') as string[];

        if (!file || !examCategories || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields in request.' }, { status: 400 });
        }

        // 1. Read file into a buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // 2. Parse the PDF content from the buffer
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        // 3. Upload file buffer to permanent storage
        const permanentFilePath = `study-materials/${Date.now()}-${file.name}`;
        const permanentFile = bucket.file(permanentFilePath);
        await permanentFile.save(fileBuffer, {
            contentType: file.type,
            public: true, // Make the file publicly readable
        });
        const downloadURL = permanentFile.publicUrl();

        // 4. Find or create the topic in Firestore
        let topicId: string | null = null;
        let newTopic: Topic | null = null;
        const finalTopicName = topicName || file.name.replace(/\.[^/.]+$/, "") || "Untitled Topic";

        const topicsRef = collection(db, 'topics');
        const q = query(topicsRef, where("title", "==", finalTopicName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingTopicDoc = querySnapshot.docs[0];
            topicId = existingTopicDoc.id;
            const topicRef = doc(db, 'topics', topicId);
            // Don't overwrite existing material, just ensure categories are there
            const existingData = existingTopicDoc.data() as Topic;
            const updatedCategories = Array.from(new Set([...existingData.examCategories, ...examCategories]));
            await updateDoc(topicRef, { material: textContent, examCategories: updatedCategories });
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
        
        // 5. Create the study material document in Firestore
        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: file.name,
            fileType: file.type,
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
        console.error('API Error in upload route:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}

    