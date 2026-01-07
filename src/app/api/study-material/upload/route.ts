
import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { StudyMaterial, Topic } from '@/lib/types';
import pdf from 'pdf-parse';

export const POST = async (req: Request) => {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage();
    if (!db || !storage) {
        return new NextResponse(JSON.stringify({ error: 'Firestore or Storage is not initialized' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const formData = await req.formData();
        const uploadedFile = formData.get('file') as File | null;
        
        if (!uploadedFile) {
            return new NextResponse(JSON.stringify({ error: 'No file uploaded.' }), { status: 400 });
        }

        const topicId = formData.get('topicId') as string | null;
        const examCategories = (formData.get('examCategories') as string | null)?.split(',') || [];
        
        const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

        // Extract text from PDF
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        // Upload original file to Firebase Storage
        const storageRef = ref(storage, `study-materials/${uuidv4()}-${uploadedFile.name}`);
        await uploadBytes(storageRef, fileBuffer, { contentType: uploadedFile.type });
        const downloadURL = await getDownloadURL(storageRef);

        let finalTopicId = topicId;

        // If 'new', create a new topic
        if (topicId === 'new') {
            const newTopic: Omit<Topic, 'id'> = {
                title: uploadedFile.name?.replace(/\.[^/.]+$/, "") || "Untitled Topic", // Use filename as title
                description: "Auto-generated topic from study material upload.",
                icon: 'file-text',
                categoryId: 'uncategorized', // Assign to a default/uncategorized category
                part: 'Part A', // Default part, admin can change later
                examCategories: examCategories as ('MTS' | 'POSTMAN' | 'PA' | 'IP')[],
                material: textContent
            };
            const topicRef = await addDoc(collection(db, 'topics'), newTopic);
            finalTopicId = topicRef.id;
        } else if (finalTopicId) {
            // Update existing topic with material
            const topicRef = doc(db, 'topics', finalTopicId);
            await updateDoc(topicRef, { material: textContent });
        }
        
        if (!finalTopicId) {
            return new NextResponse(JSON.stringify({ error: 'Topic ID is missing.' }), { status: 400 });
        }
        

        const studyMaterialDoc: Omit<StudyMaterial, 'id'> = {
            topicId: finalTopicId,
            fileName: uploadedFile.name || 'unnamed-file',
            fileType: uploadedFile.type || 'application/octet-stream',
            content: downloadURL, // Store the URL instead of the content
            uploadedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialDoc);
        const newDocument = { id: docRef.id, ...studyMaterialDoc };

        return new NextResponse(JSON.stringify({ message: 'File uploaded successfully', document: newDocument }), { status: 200 });

    } catch (error: any) {
        console.error('File upload error:', error);
        return new NextResponse(JSON.stringify({ error: error.message || 'Failed to upload file.' }), { status: 500 });
    }
};
