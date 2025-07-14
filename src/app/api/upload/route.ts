
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { addMaterialsToTopic } from '@/lib/firestore';
import formidable from 'formidable';
import type { Material } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to parse the form
async function parseForm(req: NextRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiple: true });
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
    const uploadedFiles = Array.isArray(fileField) ? fileField : (fileField ? [fileField] : []);

    if (uploadedFiles.length === 0) {
        return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }
    if (!topicId) {
        return NextResponse.json({ error: 'Topic ID is missing.' }, { status: 400 });
    }

    const processedMaterials: Material[] = [];

    for (const file of uploadedFiles) {
        const fileBuffer = await fs.readFile(file.filepath);
        const fileType = file.mimetype;
        let textContent: string;

        if (fileType === 'application/pdf') {
          const data = await pdf(fileBuffer);
          textContent = data.text;
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          textContent = result.value;
        } else {
          // Skip unsupported files but don't fail the whole request
          console.warn(`Skipping unsupported file type: ${fileType} for file ${file.originalFilename}`);
          continue;
        }

        if (!textContent.trim()) {
            console.warn(`Could not extract any text from the file: ${file.originalFilename}`);
            continue;
        }

        processedMaterials.push({
            name: file.originalFilename || `upload-${Date.now()}`,
            content: textContent,
        });
    }

    if (processedMaterials.length === 0) {
        return NextResponse.json({ error: 'No processable files found in the upload.' }, { status: 400 });
    }
    
    await addMaterialsToTopic(topicId, processedMaterials);

    return NextResponse.json({ 
        message: `Successfully processed and uploaded ${processedMaterials.length} file(s).`, 
        materials: processedMaterials 
    });

  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json({ error: 'Error processing files: ' + error.message }, { status: 500 });
  }
}
