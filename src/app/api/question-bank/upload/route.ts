
import { NextRequest, NextResponse } from 'next/server';
import { addQuestionBankDocument } from '@/lib/firestore';
import type { BankedQuestion, MCQ } from '@/lib/types';
import { z } from 'zod';

export const runtime = 'nodejs';

// Define a schema for a single MCQ object for validation
const MCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty."),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4, "There must be exactly four options."),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty."),
  topic: z.string().optional(),
  solution: z.string().optional(),
  sourceLanguage: z.string().optional().default('English'),
  translations: z.record(z.any()).optional(),
});

// Schema for the object structure, if the JSON is wrapped
const JsonObjectUploadSchema = z.object({
  questions: z.array(MCQSchema),
});

// Schema for the direct array structure
const JsonArrayUploadSchema = z.array(MCQSchema);


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[] | null;
    const examCategory = formData.get('examCategory') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }
    if (!examCategory) {
      return NextResponse.json({ error: 'Exam Category is missing.' }, { status: 400 });
    }

    let allExtractedQuestions: MCQ[] = [];

    for (const file of files) {
        if (file.type !== 'application/json') {
             return NextResponse.json({ error: `Unsupported file type: ${file.name}. Please upload JSON files only.` }, { status: 415 });
        }

        const textContent = await file.text();
        let jsonData;
        try {
            jsonData = JSON.parse(textContent);
        } catch (e) {
             // Handle files with multiple concatenated JSON objects (common copy-paste error)
            if (e instanceof SyntaxError && textContent.trim().startsWith('{') && textContent.trim().endsWith('}')) {
                const objects = textContent.trim().replace(/}\s*{/g, '}|--|{').split('|--|');
                jsonData = [];
                for (const objStr of objects) {
                    try {
                        const parsedObj = JSON.parse(objStr);
                        if (parsedObj.questions && Array.isArray(parsedObj.questions)) {
                             (jsonData as any[]).push(...parsedObj.questions);
                        } else {
                            // If it's just a single question object, add it to the array
                            (jsonData as any[]).push(parsedObj);
                        }
                    } catch (innerError) {
                         return NextResponse.json({ error: `Syntax error in JSON file: ${file.name}. Please check for issues like trailing commas or invalid structure.` }, { status: 400 });
                    }
                }
            } else if (e instanceof SyntaxError) {
                return NextResponse.json({ error: `Syntax error in JSON file: ${file.name}. Please check for issues like trailing commas.` }, { status: 400 });
            } else {
                throw e; // re-throw other errors
            }
        }
        
        // Try parsing as {"questions": [...]} first
        const objectValidation = JsonObjectUploadSchema.safeParse(jsonData);
        if (objectValidation.success) {
            allExtractedQuestions.push(...objectValidation.data.questions);
        } else {
            // If that fails, try parsing as a direct array [...]
            const arrayValidation = JsonArrayUploadSchema.safeParse(jsonData);
            if (arrayValidation.success) {
                allExtractedQuestions.push(...arrayValidation.data);
            } else {
                // If both fail, the JSON format is invalid for our needs
                console.error(`JSON validation error in ${file.name}:`, arrayValidation.error.errors);
                return NextResponse.json({ 
                    error: `Invalid JSON format in file: ${file.name}. It must be an object with a "questions" array, or a direct array of question objects.`, 
                    details: arrayValidation.error.flatten() 
                }, { status: 400 });
            }
        }
    }


    if (allExtractedQuestions.length === 0) {
      return NextResponse.json({ error: 'No valid questions could be extracted from the uploaded files.' }, { status: 400 });
    }

    if (allExtractedQuestions.some(q => !q.options.includes(q.correctAnswer))) {
      return NextResponse.json({ error: "Data integrity issue: One or more questions have a `correctAnswer` that is not present in its `options` array." }, { status: 400 });
    }
    
    const contentToStore = JSON.stringify({ questions: allExtractedQuestions }, null, 2);
    
    const firstFileName = files[0].name.replace(/\.[^/.]+$/, "");
    const newFileName = files.length > 1 ? `${firstFileName}-combined.json` : `${firstFileName}.json`;

    const newDocData: Omit<BankedQuestion, 'id'> = {
        examCategory: examCategory as any,
        fileName: newFileName,
        content: contentToStore,
        uploadedAt: new Date(),
    }
    
    const newDocRef = await addQuestionBankDocument(newDocData);
    const newDocument = { id: newDocRef.id, ...newDocData };

    return NextResponse.json({ 
        message: 'Question Bank file(s) processed and uploaded successfully.', 
        newDocument
    });

  } catch (error: any)
   {
    console.error('Error processing question bank file:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON file. Please check for syntax errors.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
