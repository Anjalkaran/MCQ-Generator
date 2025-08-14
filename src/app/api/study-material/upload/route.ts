
import { NextRequest, NextResponse } from 'next/server';
import { addStudyMaterial } from '@/lib/firestore';
import type { StudyMaterial } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
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
    const base64Content = buffer.toString('base64');
    const dataUri = `data:application/pdf;base64,${base64Content}`;

    const newMaterialData: Omit<StudyMaterial, 'id'> = {
        title,
        examCategories: examCategories as ('MTS' | 'POSTMAN' | 'PA')[],
        fileName: file.name,
        content: dataUri,
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
