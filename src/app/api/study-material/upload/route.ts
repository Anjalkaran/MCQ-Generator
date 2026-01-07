
import { NextRequest, NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebase-admin';
import type { StudyMaterial, Topic } from '@/lib/types';
import { getDownloadURL } from 'firebase-admin/storage';
import mammoth from 'mammoth';
import { arrayUnion } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const maxDuration = 120; 

const BUCKET_NAME = 'quizwiz-be479-storage';

// Function to find or create a topic and return its ID
async function findOrCreateTopic(topicName: string, examCategories: ('MTS' | 'POSTMAN' | 'PA' | 'IP')[]): Promise<string> {
    if (!adminDb) throw new Error("Firestore is not initialized.");

    const topicsRef = adminDb.collection("topics");
    const q = topicsRef.where("title", "==", topicName);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
        // Topic exists, update its exam categories to include the new ones
        const topicDoc = querySnapshot.docs[0];
        const topicRef = adminDb.collection("topics").doc(topicDoc.id);
        await topicRef.update({
            examCategories: arrayUnion(...examCategories)
        });
        return topicDoc.id;
    } else {
        // Topic does not exist, create it
        // Find 'General' category or create it
        const categoriesRef = adminDb.collection("categories");
        const catQuery = categoriesRef.where("name", "==", "General");
        const catSnapshot = await catQuery.get();
        let categoryId = '';

        if (catSnapshot.empty) {
            const newCatRef = await categoriesRef.add({ name: 'General', examCategories: ['MTS', 'POSTMAN', 'PA', 'IP'] });
            categoryId = newCatRef.id;
        } else {
            categoryId = catSnapshot.docs[0].id;
        }

        const newTopic: Omit<Topic, 'id'> = {
            title: topicName,
            description: `Auto-created topic for ${topicName}`,
            icon: 'file-text',
            categoryId: categoryId,
            part: 'Part A', // Default part
            examCategories: examCategories,
        };
        const newTopicRef = await topicsRef.add(newTopic);
        return newTopicRef.id;
    }
}


export async function POST(req: NextRequest) {
  if (!adminDb || !adminStorage) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const topicName = formData.get('topicName') as string | null;
    const examCategoriesStr = formData.get('examCategories') as string | null;

    if (!file || !topicName || !examCategoriesStr) {
      return NextResponse.json({ error: 'File, Topic Name, and Exam Categories are required.' }, { status: 400 });
    }
    
    let examCategories: ('MTS' | 'POSTMAN' | 'PA' | 'IP')[];
    try {
        examCategories = JSON.parse(examCategoriesStr);
        if (!Array.isArray(examCategories) || examCategories.length === 0) {
            throw new Error("Invalid format");
        }
    } catch(e) {
        return NextResponse.json({ error: 'Exam Categories are in an invalid format.' }, { status: 400 });
    }

    const topicId = await findOrCreateTopic(topicName, examCategories);
    
    let buffer: Buffer;
    let finalFileName = file.name;
    let finalMimeType = file.type;

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
        const arrayBuffer = await file.arrayBuffer();
        const docxBuffer = Buffer.from(arrayBuffer);
        const { value } = await mammoth.convertToHtml({ buffer: docxBuffer });
        buffer = Buffer.from(value, 'utf-8');
        finalFileName = file.name.replace(/\.docx?$/, '.html');
        finalMimeType = 'text/html';
    } else {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    }
    
    const bucket = adminStorage.bucket(BUCKET_NAME);
    const filePath = `study-materials/${topicId}/${Date.now()}-${finalFileName}`;
    const fileUpload = bucket.file(filePath);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: finalMimeType,
      },
    });

    await new Promise((resolve, reject) => {
        stream.on('error', (err) => {
            console.error("Upload stream error:", err);
            reject(err);
        });
        stream.on('finish', resolve);
        stream.end(buffer);
    });
    
    const downloadUrl = await getDownloadURL(fileUpload);

    const materialData: Omit<StudyMaterial, 'id'> = {
      topicId: topicId,
      fileName: finalFileName,
      downloadUrl: downloadUrl,
      uploadedAt: new Date(),
      fileType: finalMimeType,
    };
    
    const docRef = await adminDb.collection("studyMaterials").add(materialData);

    return NextResponse.json({ 
        message: 'Material uploaded successfully.', 
        newDocument: { id: docRef.id, ...materialData }
    });

  } catch (error: any) {
    console.error('Error processing study material file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
