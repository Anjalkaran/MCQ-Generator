
import { NextRequest, NextResponse } from 'next/server';
import { addLiveTestBankDocument } from '@/lib/firestore';
import type { BankedQuestion, MCQ } from '@/lib/types';
import { z } from 'zod';
import mammoth from 'mammoth';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/googleai';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const runtime = 'nodejs';
export const maxDuration = 300; 

// Define a schema for a single MCQ object for validation and AI output
const MCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty."),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4, "There must be exactly four options."),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty."),
  topic: z.string().optional(),
  solution: z.string().optional(),
  sourceLanguage: z.string().optional().default('English'),
  translations: z.record(z.any()).optional(),
});

// Schema for the final JSON structure stored in Firestore
const JsonUploadSchema = z.object({
  questions: z.array(MCQSchema),
});

const extractMCQsFromText = async (textContent: string): Promise<MCQ[]> => {
    const prompt = `You are an expert at meticulously parsing and formatting multiple-choice questions (MCQs) from raw text. Your task is to extract all questions and their complete data, including translations if available, and format them into a valid JSON structure.

**Process:**
1.  **Identify Blocks:** Read the 'TEXT CONTENT' and identify each distinct multiple-choice question block. A block includes the question, its options, the correct answer, topic, solution, and any provided translations.
2.  **Extract Core Data:** For each question, accurately extract the full question text, all four options, the indicated correct answer, topic, and the step-by-step solution if provided.
3.  **Extract Translations:** If a 'translations' object is present for a question, extract it completely, preserving its structure and all nested language objects (e.g., "ta", "hi").
4.  **Set Defaults:**
    *   If a 'sourceLanguage' field is not found, default it to "English".
    *   If a 'solution' is not found, the 'solution' field MUST be an empty string ("").
    *   If a 'topic' is not found, the 'topic' field MUST be an empty string ("").

**CRITICAL INSTRUCTIONS:**
*   Do NOT verify, correct, or change any of the content. Extract it exactly as it appears.
*   The 'correctAnswer' field MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   **TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix. For example, "a. The quick brown fox" should become "The quick brown fox".

--- TEXT CONTENT ---
${textContent}
--- END TEXT CONTENT ---

Your final output must be a single, valid JSON object containing a 'questions' array with all the valid questions you were able to extract from the text.
`;

    const llmResponse = await generate({
        model: gemini15Pro,
        prompt: prompt,
        output: {
            format: 'json',
            schema: zodToJsonSchema(JsonUploadSchema) as any,
        },
        config: { temperature: 0.1 }
    });
    
    const parsedOutput = llmResponse.json();
    if (!parsedOutput || !parsedOutput.questions) {
        throw new Error('AI failed to extract any questions from the provided text.');
    }
    return parsedOutput.questions;
};


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
        let extractedFromFile: MCQ[] = [];

        if (file.type === 'application/json') {
            const textContent = await file.text();
            const jsonData = JSON.parse(textContent);
            const validationResult = JsonUploadSchema.safeParse(jsonData);
            if (!validationResult.success) {
                console.error(`JSON validation error in ${file.name}:`, validationResult.error.errors);
                return NextResponse.json({ error: `Invalid JSON format in file: ${file.name}. It must be an object with a "questions" array.`, details: validationResult.error.flatten() }, { status: 400 });
            }
            extractedFromFile = validationResult.data.questions;

        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'text/plain') {
            let textContent: string;
            if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const buffer = Buffer.from(await file.arrayBuffer());
                const result = await mammoth.extractRawText({ buffer });
                textContent = result.value;
            } else {
                textContent = await file.text();
            }

            if (!textContent.trim()) {
                continue; // Skip empty files
            }
            
            extractedFromFile = await extractMCQsFromText(textContent);
        } else {
            return NextResponse.json({ error: `Unsupported file type: ${file.name}. Please upload JSON, DOCX, or TXT files.` }, { status: 415 });
        }
        
        allExtractedQuestions.push(...extractedFromFile);
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
    
    const newDocRef = await addLiveTestBankDocument(newDocData);
    const newDocument = { id: newDocRef.id, ...newDocData };

    return NextResponse.json({ 
        message: 'Live test question paper(s) processed and uploaded successfully.', 
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
