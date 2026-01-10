
import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase-admin';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import type { Topic } from '@/lib/types';
import formidable from 'formidable';
import fs from 'fs/promises';

// This function is defined to match the expected API route structure in Next.js 13+ App Router.
// The formidable config is set to disable the default body parser.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to parse form data
const parseForm = (req: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        // @ts-ignore
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};


export async function POST(request: Request) {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage();
    if (!db || !storage) {
        return NextResponse.json({ error: 'Firebase is not initialized.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        let topicId = formData.get('topicId') as string | null;
        const examCategories = JSON.parse(formData.get('examCategories') as string || '[]');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        
        if (topicId === 'undefined' || topicId === 'null') {
          topicId = 'new';
        }

        const fileBuffer = await file.arrayBuffer();
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        const filePath = `study-materials/${uuidv4()}-${file.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(fileRef);

        let newTopic: Topic | null = null;
        if (topicId === 'new') {
            const newTopicData: Omit<Topic, 'id'> = {
                title: file.name?.replace(/\.[^/.]+$/, "") || "Untitled Topic",
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

        } else if (topicId) {
            const topicRef = doc(db, 'topics', topicId);
            await updateDoc(topicRef, { material: textContent });
        }
        
        if (!topicId) {
            return NextResponse.json({ error: 'Topic ID is missing.' }, { status: 400 });
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
