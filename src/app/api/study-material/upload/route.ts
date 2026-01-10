
import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase-admin';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import type { Topic } from '@/lib/types';


export async function POST(request: Request) {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage();
    if (!db || !storage) {
        return NextResponse.json({ error: 'Firebase is not initialized.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        let topicName = formData.get('topicName') as string | null;
        const examCategories = JSON.parse(formData.get('examCategories') as string || '[]');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        
        if (!topicName) {
            topicName = file.name?.replace(/\.[^/.]+$/, "") || "Untitled Topic";
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        const filePath = `study-materials/${uuidv4()}-${file.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(fileRef);
        
        let topicId: string | null = null;
        let newTopic: Topic | null = null;

        // Check if topic with this name already exists
        const topicsRef = collection(db, 'topics');
        const q = query(topicsRef, where("title", "==", topicName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Topic exists, use its ID
            const existingTopicDoc = querySnapshot.docs[0];
            topicId = existingTopicDoc.id;
            const topicRef = doc(db, 'topics', topicId);
            await updateDoc(topicRef, { material: textContent });
        } else {
            // Topic does not exist, create a new one
            const newTopicData: Omit<Topic, 'id'> = {
                title: topicName,
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
            return NextResponse.json({ error: 'Failed to find or create a topic.' }, { status: 500 });
        }
        
        const studyMaterialDoc = {
            topicId: topicId,
            fileName: file.name || 'unnamed-file',
            fileType: file.type || 'application/octet-stream',
            content: downloadURL,
            uploadedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialDoc);
        const newMaterial = { id: docRef.id, ...studyMaterialDoc };

        return NextResponse.json({
            message: 'File uploaded and processed successfully.',
            newMaterial,
            newTopic
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
    }
}
