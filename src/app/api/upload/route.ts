
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { updateTopic } from '@/lib/firestore';
import { writeFile } from 'fs/promises'
import { join } from 'path'


export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const file: File | null = data.get('file') as unknown as File;
  const topicId: string | null = data.get('topicId') as string;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }
  if (!topicId) {
    return NextResponse.json({ error: 'Topic ID is missing.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // In a real app, you'd want to write to a temp directory
  const tempFilePath = join('/tmp', file.name);
  await writeFile(tempFilePath, buffer)

  try {
    let textContent: string;
    const fileType = file.type;

    if (fileType === 'application/pdf') {
      const data = await pdf(buffer);
      textContent = data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' }, { status: 400 });
    }

    if (!textContent.trim()) {
        throw new Error("Could not extract any text from the file.");
    }

    // Save the extracted text to Firestore
    await updateTopic(topicId, { material: textContent });

    return NextResponse.json({ message: 'File uploaded and processed successfully.', material: textContent });

  } catch (error: any) {
    console.error('Error processing file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  } finally {
     // Clean up the temporary file
    try {
        await fs.unlink(tempFilePath);
    } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
    }
  }
}
