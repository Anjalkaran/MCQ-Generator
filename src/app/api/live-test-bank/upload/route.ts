
import { NextRequest, NextResponse } from 'next/server';
import { addLiveTestBankDocument } from '@/lib/firestore';
import type { BankedQuestion, MCQ } from '@/lib/types';
import { z } from 'zod';
import mammoth from 'mammoth';
import { ai } from '@/ai/genkit';

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

// Schema for the object structure, if the JSON is wrapped
const JsonObjectUploadSchema = z.object({
  questions: z.array(MCQSchema),
});

// Schema for the direct array structure
const JsonArrayUploadSchema = z.array(MCQSchema);


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
*   Your final output must be ONLY a single, valid JSON object that adheres to the schema: {"questions": [...]}. Do NOT include any introductory text, markdown formatting like \`\`\`json, or any other text outside of the JSON object itself.

--- TEXT CONTENT ---
${textContent}
--- END TEXT CONTENT ---
`;

    const llmResponse = await ai.generate({
        model: 'googleai/gemini-1.5-pro',
        prompt: prompt,
    });
    
    const textResponse = llmResponse.text;
    if (!textResponse) {
        throw new Error('AI failed to return a response.');
    }
    
    try {
        // Clean the response: remove markdown and any leading/trailing whitespace.
        const cleanedText = textResponse.replace(/^```json\s*|```\s*$/g, '').trim();
        const parsedJson = JSON.parse(cleanedText);
        const validated = JsonObjectUploadSchema.safeParse(parsedJson);
        if (!validated.success) {
            console.error("AI output failed validation:", validated.error);
            throw new Error('AI returned data in an invalid format.');
        }
        return validated.data.questions;
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", textResponse, e);
        throw new Error('AI returned an invalid JSON object. Please check the document content and try again.');
    }
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
            let jsonData;
            try {
                jsonData = JSON.parse(textContent);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    return NextResponse.json({ error: `Syntax error in JSON file: ${file.name}. Please check for issues like trailing commas.` }, { status: 400 });
                }
                throw e; // re-throw other errors
            }
            
            // Try parsing as {"questions": [...]} first
            const objectValidation = JsonObjectUploadSchema.safeParse(jsonData);
            if (objectValidation.success) {
                extractedFromFile = objectValidation.data.questions;
            } else {
                // If that fails, try parsing as a direct array [...]
                const arrayValidation = JsonArrayUploadSchema.safeParse(jsonData);
                if (arrayValidation.success) {
                    extractedFromFile = arrayValidation.data;
                } else {
                    // If both fail, the JSON format is invalid for our needs
                    console.error(`JSON validation error in ${file.name}:`, arrayValidation.error.errors);
                    return NextResponse.json({ 
                        error: `Invalid JSON format in file: ${file.name}. It must be an object with a "questions" array, or a direct array of question objects.`, 
                        details: arrayValidation.error.flatten() 
                    }, { status: 400 });
                }
            }

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
