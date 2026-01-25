import { NextResponse } from 'next/server';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase-admin';
import type { Topic, StudyMaterial } from '@/lib/types';
import pdf from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

export const config = {
    api: {
        bodyParser: false,
    },
};

// This function now returns a standard File object and FormData fields
async function parseFormData(request: Request): Promise<{ fields: { [key: string]: string[] }; files: { [key: string]: File[] } }> {
    const formData = await request.formData();
    const fields: { [key: string]: string[] } = {};
    const files: { [key: string]: File[] } = {};

    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
             const fileArray = files[key] || [];
             fileArray.push(value);
             files[key] = fileArray;
        } else {
            const fieldArray = fields[key] || [];
            fieldArray.push(String(value));
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
        
        const file = files.file?.[0];
        const topicName = fields.topicName?.[0];
        const examCategories = fields.examCategories || [];

        if (!file || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: file and at least one exam category are required.' }, { status: 400 });
        }
        
        // 1. Read file buffer from File object and parse PDF content
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        // 2. Upload to Firebase Storage
        const bucket = storage.bucket();
        const fileName = `${uuidv4()}-${file.name}`;
        const fileUpload = bucket.file(`study-materials/${fileName}`);
        
        await fileUpload.save(fileBuffer, {
            metadata: { contentType: file.type },
        });

        // Make the file public and get its URL
        await fileUpload.makePublic();
        const downloadURL = fileUpload.publicUrl();

        // 3. Find or create the topic in Firestore using Admin SDK
        let topicId: string | null = null;
        let newTopic: Topic | null = null;
        const finalTopicName = topicName || file.name?.replace(/\.[^/.]+$/, "") || "Untitled Topic";

        const topicsRef = db.collection('topics');
        const q = topicsRef.where("title", "==", finalTopicName).limit(1);
        const querySnapshot = await q.get();

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
            const topicRef = await topicsRef.add(newTopicData);
            topicId = topicRef.id;
            newTopic = { id: topicId, ...newTopicData };
        }
        
        if (!topicId) {
            throw new Error('Failed to find or create a topic.');
        }

        // 4. Create the study material document in Firestore
        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: file.name || 'Untitled',
            fileType: file.type || 'application/pdf',
            content: downloadURL,
            uploadedAt: new Date(),
        };

        const docRef = await db.collection('studyMaterials').add(studyMaterialData);
        const newMaterial = { id: docRef.id, ...studyMaterialData };

        // 5. Append text content to the topic's material field
        const topicRef = db.collection('topics').doc(topicId);
        const topicSnap = await topicRef.get();
        const currentMaterial = topicSnap.exists ? topicSnap.data()?.material || "" : "";
        const updatedMaterial = currentMaterial + "\n\n--- " + (file.name || 'New Material') + " ---\n\n" + textContent;
        await topicRef.update({ material: updatedMaterial });


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
