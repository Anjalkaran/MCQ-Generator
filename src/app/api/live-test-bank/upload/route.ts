
import { NextRequest, NextResponse } from 'next/server';
import { addLiveTestBankDocument } from '@/lib/firestore';
import type { BankedQuestion, MCQ } from '@/lib/types';
import { z } from 'zod';

export const runtime = 'nodejs';

// Define a schema for a single MCQ object for validation
const MCQSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
  topic: z.string(),
  solution: z.string().optional(),
});

// Define the schema for the entire JSON file (an array of MCQs)
const JsonUploadSchema = z.array(MCQSchema);

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

    if (file.type !== 'application/json') {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a JSON file.' }, { status: 415 });
    }

    const textContent = await file.text();
    const jsonData = JSON.parse(textContent);

    // Validate the JSON structure against our schema
    const validationResult = JsonUploadSchema.safeParse(jsonData);
    if (!validationResult.success) {
        console.error("JSON validation error:", validationResult.error.errors);
        return NextResponse.json({ error: 'Invalid JSON format. Please check the file structure.', details: validationResult.error.flatten() }, { status: 400 });
    }

    if (validationResult.data.some(q => !q.options.includes(q.correctAnswer))) {
      return NextResponse.json({ error: "Data integrity issue: One or more questions have a `correctAnswer` that is not present in its `options` array." }, { status: 400 });
    }
    
    // Store the validated JSON as a string in Firestore
    const newDocData: Omit<BankedQuestion, 'id'> = {
        examCategory: examCategory as any,
        fileName: file.name,
        content: JSON.stringify(validationResult.data), // Store as a string
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
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON file. Please check for syntax errors.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
