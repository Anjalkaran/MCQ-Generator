
import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { addQuestionBankDocument } from '@/lib/firestore';
import type { BankedQuestion } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const examCategory = formData.get('examCategory') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }
    if (!examCategory) {
      return NextResponse.json({ error: 'Exam Category is missing.' }, { status: 400 });
    }

    const newDocuments = [];

    for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        let textContent: string;

        if (file.type === 'application/pdf') {
            const data = await pdf(buffer);
            textContent = data.text;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            textContent = result.value;
        } else {
            // Skip unsupported file types or return an error for the batch
             console.warn(`Skipping unsupported file type: ${file.name} (${file.type})`);
             continue;
        }

        if (!textContent.trim()) {
            console.warn(`Could not extract any text from the file: ${file.name}`);
            continue;
        }
        
        const newDocData: Omit<BankedQuestion, 'id'> = {
            examCategory: examCategory as any,
            fileName: file.name,
            content: textContent,
            uploadedAt: new Date(),
        }
        
        const newDocRef = await addQuestionBankDocument(newDocData);
        newDocuments.push({ id: newDocRef.id, ...newDocData });
    }
    
    if (newDocuments.length === 0) {
        return NextResponse.json({ error: 'No valid files were processed.' }, { status: 400 });
    }

    return NextResponse.json({ 
        message: 'Question Bank updated successfully.', 
        newDocuments
    });

  } catch (error: any) {
    console.error('Error processing question bank file:', error);
    return NextResponse.json({ error: 'Error processing files: ' + error.message }, { status: 500 });
  }
}
