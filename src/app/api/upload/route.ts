
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { updateTopic } from '@/lib/firestore';
import formidable from 'formidable';

export const dynamic = 'force-dynamic';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to parse the form
async function parseForm(req: NextRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse(req as any, (err, fields, files) => {
            if (err) {
                reject(err);
            }
            resolve({ fields, files });
        });
    });
}


export async function POST(req: NextRequest) {
  try {
    const { fields, files } = await parseForm(req);

    const topicIdField = fields.topicId;
    const topicId = Array.isArray(topicIdField) ? topicIdField[0] : topicIdField;
    
    const fileField = files.file;
    const file = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (!topicId) {
        return NextResponse.json({ error: 'Topic ID is missing.' }, { status: 400 });
    }

    const fileBuffer = await fs.readFile(file.filepath);

    let textContent: string;
    const fileType = file.mimetype;

    if (fileType === 'application/pdf') {
      const data = await pdf(fileBuffer);
      textContent = data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      textContent = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' }, { status: 400 });
    }

    if (!textContent.trim()) {
        throw new Error("Could not extract any text from the file.");
    }

    await updateTopic(topicId, { material: textContent });

    return NextResponse.json({ message: 'File uploaded and processed successfully.', material: textContent });

  } catch (error: any) {
    console.error('Error processing file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
