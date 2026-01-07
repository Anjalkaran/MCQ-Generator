
import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { addDoc, collection } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { StudyMaterial } from '@/lib/types';
import { getDownloadURL } from 'firebase-admin/storage';
import mammoth from 'mammoth';
import { Readable } from 'stream';

export const runtime = 'nodejs';

// Increase the max duration for this function to handle larger uploads and conversions.
export const maxDuration = 120; 

const BUCKET_NAME = "quizwiz-be479-storage";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function POST(req: NextRequest) {
  const db = getFirebaseDb();
  if (!db || !adminStorage) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const topicId = formData.get('topicId') as string | null;

    if (!file || !topicId) {
      return NextResponse.json({ error: 'File and Topic ID are required.' }, { status: 400 });
    }
    
    let buffer: Buffer;
    let finalFileName = file.name;
    let finalMimeType = file.type;

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
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
