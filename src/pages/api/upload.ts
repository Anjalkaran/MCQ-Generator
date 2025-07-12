import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, type File } from 'formidable';
import { promises as fs } from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { updateTopic } from '@/lib/firestore';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();
  let tempFile: File | null = null;

  try {
    const [fields, files] = await form.parse(req);
    
    const topicId = Array.isArray(fields.topicId) ? fields.topicId[0] : fields.topicId;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    tempFile = file;

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is missing.' });
    }
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    let textContent: string;
    const filePath = file.filepath;
    const fileType = file.mimetype;

    if (fileType === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      textContent = data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      textContent = result.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' });
    }

    if (!textContent.trim()) {
        throw new Error("Could not extract any text from the file.");
    }

    // Save the extracted text to Firestore
    await updateTopic(topicId, { material: textContent });

    return res.status(200).json({ message: 'File uploaded and processed successfully.', material: textContent });

  } catch (error: any) {
    console.error('Error processing file:', error);
    return res.status(500).json({ error: 'Error processing file: ' + error.message });
  } finally {
    // Clean up the temporary file
    if (tempFile?.filepath) {
      try {
        await fs.unlink(tempFile.filepath);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
  }
}
