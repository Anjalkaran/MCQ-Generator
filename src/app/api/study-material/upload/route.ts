
import { NextRequest, NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebase-admin';
import { addDoc, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { StudyMaterial, Topic } from '@/lib/types';
import { getDownloadURL } from 'firebase-admin/storage';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 120; 

const BUCKET_NAME = "quizwiz-be479-storage";

// Function to find or create a topic and return its ID
async function findOrCreateTopic(topicName: string): Promise<string> {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized.");

    const topicsRef = collection(db, "topics");
    const q = query(topicsRef, where("title", "==", topicName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Topic exists, return its ID
        return querySnapshot.docs[0].id;
    } else {
        // Topic does not exist, create it
        // Find 'General' category or create it
        const categoriesRef = collection(db, "categories");
        const catQuery = query(categoriesRef, where("name", "==", "General"));
        const catSnapshot = await getDocs(catQuery);
        let categoryId = '';

        if (catSnapshot.empty) {
            const newCatRef = await addDoc(categoriesRef, { name: 'General', examCategories: ['MTS'] });
            categoryId = newCatRef.id;
        } else {
            categoryId = catSnapshot.docs[0].id;
        }

        const newTopic: Omit<Topic, 'id'> = {
            title: topicName,
            description: `Auto-created topic for ${topicName}`,
            icon: 'file-text',
            categoryId: categoryId,
            part: 'Part A',
            examCategories: ['MTS'],
        };
        const newTopicRef = await addDoc(topicsRef, newTopic);
        return newTopicRef.id;
    }
}


export async function POST(req: NextRequest) {
  const db = getFirebaseDb();
  if (!db || !adminStorage) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const topicName = formData.get('topicName') as string | null;

    if (!file || !topicName) {
      return NextResponse.json({ error: 'File and Topic Name are required.' }, { status: 400 });
    }
    
    const topicId = await findOrCreateTopic(topicName);
    
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
    
    const docRef = await addDoc(collection(db, "studyMaterials"), materialData);

    return NextResponse.json({ 
        message: 'Material uploaded successfully.', 
        newDocument: { id: docRef.id, ...materialData }
    });

  } catch (error: any) {
    console.error('Error processing study material file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
