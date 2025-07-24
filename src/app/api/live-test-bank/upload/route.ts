
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { addLiveTestBankDocument } from '@/lib/firestore';
import type { BankedQuestion } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const examCategory = formData.get('examCategory') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (!examCategory) {
      return NextResponse.json({ error: 'Exam Category is missing.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let textContent: string;

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
    } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a DOCX file.' }, { status: 415 });
    }

    if (!textContent.trim()) {
        return NextResponse.json({ error: 'Could not extract any text from the file.' }, { status: 400 });
    }
    
    const newDocData: Omit<BankedQuestion, 'id'> = {
        examCategory: examCategory as any,
        fileName: file.name,
        content: textContent,
        uploadedAt: new Date(),
    }
    
    const newDocRef = await addLiveTestBankDocument(newDocData);
    const newDocument = { id: newDocRef.id, ...newDocData };

    return NextResponse.json({ 
        message: 'Live test question paper uploaded successfully.', 
        newDocument
    });

  } catch (error: any) {
    console.error('Error processing live test file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
