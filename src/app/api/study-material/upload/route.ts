import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase-admin';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import type { Topic, StudyMaterial } from '@/lib/types';
import { formidable, type File } from 'formidable';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

export const config = {
    api: {
        bodyParser: false,
    },
};

async function parseFormData(request: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
    const formData = await request.formData();
    const fields: formidable.Fields = {};
    const files: formidable.Files = {};

    for (const [key, value] of formData.entries()) {
        if (value instanceof Blob) {
             const fileArray = files[key] || [];
             fileArray.push(value as any); // Formidable expects a specific structure
             files[key] = fileArray;
        } else {
            const fieldArray = fields[key] || [];
            fieldArray.push(value);
            fields[key] = fieldArray;
        }
    }
    return { fields, files };
}


export async function POST(request: Request) {
    const db = getFirebaseDb();
    const storage = getFirebaseStorage();
    if (!db || !storage) {
        return NextResponse.json({ error: 'Firebase is not initialized.' }, { status: 500 });
    }

    try {
        const { fields, files } = await parseFormData(request);
        
        const file = (files.file?.[0] as File | undefined);
        const topicName = fields.topicName?.[0];
        const examCategories = fields.examCategories || [];

        if (!file || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: file and at least one exam category are required.' }, { status: 400 });
        }
        
        // 1. Read file buffer and parse PDF content
        const fileBuffer = await fs.readFile(file.filepath);
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        // 2. Upload to Firebase Storage
        const bucket = storage.bucket();
        const fileName = `${uuidv4()}-${file.originalFilename}`;
        const fileUpload = bucket.file(`study-materials/${fileName}`);
        
        await fileUpload.save(fileBuffer, {
            metadata: { contentType: file.mimetype },
        });

        // Make the file public and get its URL
        await fileUpload.makePublic();
        const downloadURL = fileUpload.publicUrl();

        // 3. Find or create the topic in Firestore
        let topicId: string | null = null;
        let newTopic: Topic | null = null;
        const finalTopicName = topicName || file.originalFilename?.replace(/\.[^/.]+$/, "") || "Untitled Topic";

        const topicsRef = collection(db, 'topics');
        const q = query(topicsRef, where("title", "==", finalTopicName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            topicId = querySnapshot.docs[0].id;
        } else {
            const newTopicData: Omit<Topic, 'id'> = {
                title: finalTopicName,
                description: "Auto-generated topic from study material upload.",
                icon: 'file-text',
                categoryId: 'uncategorized', 
                part: 'Part A', // Default part
                examCategories: examCategories as ('MTS' | 'POSTMAN' | 'PA' | 'IP')[],
            };
            const topicRef = await addDoc(topicsRef, newTopicData);
            topicId = topicRef.id;
            newTopic = { id: topicId, ...newTopicData };
        }
        
        if (!topicId) {
            throw new Error('Failed to find or create a topic.');
        }

        // 4. Create the study material document in Firestore
        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: file.originalFilename || 'Untitled',
            fileType: file.mimetype || 'application/pdf',
            content: downloadURL,
            uploadedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialData);
        const newMaterial = { id: docRef.id, ...studyMaterialData };

        // 5. Append text content to the topic's material field
        const topicRef = doc(db, 'topics', topicId);
        const topicSnap = await getDoc(topicRef);
        const currentMaterial = topicSnap.exists() ? topicSnap.data()?.material || "" : "";
        const updatedMaterial = currentMaterial + "\n\n--- " + (file.originalFilename || 'New Material') + " ---\n\n" + textContent;
        await updateDoc(topicRef, { material: updatedMaterial });


        return NextResponse.json({
            message: 'File processed and uploaded successfully.',
            newMaterial,
            newTopic
        });

    } catch (error: any) {
        console.error('API Error in upload route:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
    