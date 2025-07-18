
import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { addQuestionBankDocument } from '@/lib/firestore';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    if (file.type === 'application/pdf') {
      const data = await pdf(buffer);
      textContent = data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' }, { status: 415 });
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: 'Could not extract any text from the file.' }, { status: 400 });
    }
    
    await addQuestionBankDocument({
        examCategory: examCategory as any,
        fileName: file.name,
        content: textContent,
        uploadedAt: new Date(),
    });

    return NextResponse.json({ 
        message: 'Question Bank updated successfully.', 
    });

  } catch (error: any) {
    console.error('Error processing question bank file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
