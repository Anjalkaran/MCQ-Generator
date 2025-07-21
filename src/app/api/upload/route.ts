
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { addMaterialToTopic } from '@/lib/firestore';

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
    
    await addMaterialToTopic(topicId, textContent);

    return NextResponse.json({ 
        message: 'Material uploaded and added to topic successfully.', 
        material: textContent 
    });

  } catch (error: any) {
    console.error('Error processing file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
