
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { addTopicMCQDocument } from '@/lib/firestore';
import type { TopicMCQ } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const topicId = formData.get('topicId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID is missing.' }, { status: 400 });
    }

    if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a DOCX file.' }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    const textContent = result.value;
    
    if (!textContent.trim()) {
        return NextResponse.json({ error: 'Could not extract any text from the file.' }, { status: 400 });
    }
    
    const newDocData: Omit<TopicMCQ, 'id'> = {
        topicId: topicId,
        fileName: file.name,
        content: textContent,
        uploadedAt: new Date(),
    }
    
    const newDocRef = await addTopicMCQDocument(newDocData);
    const newDocument = { id: newDocRef.id, ...newDocData };

    return NextResponse.json({ 
        message: 'Topic MCQ document uploaded successfully.', 
        newDocument
    });

  } catch (error: any) {
    console.error('Error processing topic MCQ file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
