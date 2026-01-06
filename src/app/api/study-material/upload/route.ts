
import { NextRequest, NextResponse } from 'next/server';
import { addStudyMaterial } from '@/lib/firestore';
import type { StudyMaterial } from '@/lib/types';
import { adminStorage } from '@/lib/firebase-admin';
import { getDownloadURL } from 'firebase-admin/storage';

export const runtime = 'nodejs';
export const maxDuration = 300; 


export async function POST(req: NextRequest) {
  if (!adminStorage) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized for storage.' }, { status: 500 });
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
    const bucket = adminStorage.bucket("quizwiz-be479.appspot.com");
    const filePath = `study-materials/${Date.now()}-${file.name}`;
    const fileUpload = bucket.file(filePath);

    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    const downloadURL = await getDownloadURL(fileUpload);

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
