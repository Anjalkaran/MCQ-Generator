
import { NextRequest, NextResponse } from 'next/server';
import { addStudyMaterial } from '@/lib/firestore';
import type { StudyMaterial } from '@/lib/types';
import { adminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const maxDuration = 300; 

const BUCKET_NAME = "quizwiz-be479.appspot.com";

export async function POST(req: NextRequest) {
  if (!adminStorage) {
    console.error('Firebase Admin SDK not initialized for storage.');
    return NextResponse.json({ error: 'Server storage configuration error.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const examCategories = formData.getAll('examCategories') as string[] | null;

    if (!file || !title || !examCategories || examCategories.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: file, title, and examCategories are required.' }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF file.' }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    console.log(`Attempting to access storage bucket: ${BUCKET_NAME}`);
    const bucket = adminStorage.bucket(BUCKET_NAME);
    
    const filePath = `study-materials/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const fileUpload = bucket.file(filePath);

    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make the file public to get a shareable URL
    await fileUpload.makePublic();

    // Construct the public URL
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    const newMaterialData: Omit<StudyMaterial, 'id'> = {
        title,
        examCategories: examCategories as ('MTS' | 'POSTMAN' | 'PA' | 'IP')[],
        fileName: file.name,
        content: downloadURL, // Store the public URL
        uploadedAt: new Date(),
    };
    
    const docRef = await addStudyMaterial(newMaterialData);

    const newDocument = { id: docRef.id, ...newMaterialData };

    return NextResponse.json({ 
        message: 'Study material uploaded successfully.', 
        newDocument,
    });

  } catch (error: any) {
    console.error('Error processing study material file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
