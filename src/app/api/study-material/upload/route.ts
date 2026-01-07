
import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formidable } from 'formidable';
import fs from 'fs/promises';
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
        const form = formidable({});
        const [fields, files] = await form.parse(req as any);

        const uploadedFile = files.file?.[0];
        if (!uploadedFile) {
            return new NextResponse(JSON.stringify({ error: 'No file uploaded.' }), { status: 400 });
        }

        const topicId = fields.topicId?.[0];
        const examCategories = fields.examCategories?.[0]?.split(',') || [];
        const filePath = uploadedFile.filepath;
        const fileData = await fs.readFile(filePath);

        // Extract text from PDF
        const pdfData = await pdf(fileData);
        const textContent = pdfData.text;

        // Upload original file to Firebase Storage
        const storageRef = ref(storage, `study-materials/${uuidv4()}-${uploadedFile.originalFilename}`);
        await uploadBytes(storageRef, fileData, { contentType: uploadedFile.mimetype });
        const downloadURL = await getDownloadURL(storageRef);

        let finalTopicId = topicId;

        // If 'new', create a new topic
        if (topicId === 'new') {
            const newTopic: Omit<Topic, 'id'> = {
                title: uploadedFile.originalFilename?.replace(/\.[^/.]+$/, "") || "Untitled Topic", // Use filename as title
                description: "Auto-generated topic from study material upload.",
                icon: 'file-text',
                categoryId: 'uncategorized', // Assign to a default/uncategorized category
                part: 'Part A', // Default part, admin can change later
                examCategories: examCategories,
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
            fileName: uploadedFile.originalFilename || 'unnamed-file',
            fileType: uploadedFile.mimetype || 'application/octet-stream',
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
