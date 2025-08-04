
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { addTopicMCQDocument, updateTopicMCQDocument } from '@/lib/firestore';
import type { TopicMCQ, MCQ } from '@/lib/types';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/googleai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const runtime = 'nodejs';
export const maxDuration = 300; 

const MCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty.").describe('The multiple-choice question text only. It must NOT contain the answer options.'),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4).describe('An array of four possible answers, with the full text for each option.'),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty.").describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
  solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
  topic: z.string().optional().describe("The specific topic of the question."),
});

const MCQOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The extracted multiple-choice questions.'),
});

// Zod schema for validating uploaded JSON content
const JsonUploadSchema = z.object({
  mcqs: z.array(MCQSchema),
});


const extractMCQsFromText = async (textContent: string, topicName: string): Promise<MCQ[]> => {
    const prompt = `You are an expert at parsing and formatting multiple-choice questions (MCQs).
Your task is to extract as many high-quality, unique questions as you can find from the 'TEXT CONTENT' provided below and format them.
**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  For EACH extracted question, you MUST add a 'topic' field with the value "${topicName}".
4.  If a solution is not found for a question, the 'solution' field MUST be an empty string ("").
**CRITICAL INSTRUCTIONS:**
*   Do NOT verify, correct, or change any of the content. Extract it exactly as it appears in the text.
*   The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the \`options\` array.
*   **TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix from the option text before including it in the output. For example, "a. The quick brown fox" should become "The quick brown fox".
*   You MUST extract the actual text content for all fields. NEVER output the literal word "string" as a value for any field.
--- TEXT CONTENT ---
${textContent}
--- END TEXT CONTENT ---
Your final output must be a single, valid JSON object containing an 'mcqs' array with all the valid questions you were able to extract from the text.`;

    const llmResponse = await generate({
        model: gemini15Pro,
        prompt: prompt,
        output: {
            format: 'json',
            schema: zodToJsonSchema(MCQOutputSchema) as any,
        },
        config: { temperature: 0.1 }
    });
    
    const parsedOutput = llmResponse.json();
    return parsedOutput?.mcqs || [];
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[] | null;
    const topicId = formData.get('topicId') as string | null;
    const topicTitle = formData.get('topicTitle') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }
    if (!topicId || !topicTitle) {
      return NextResponse.json({ error: 'Topic ID and Title are missing.' }, { status: 400 });
    }

    let allExtractedMCQs: MCQ[] = [];

    for (const file of files) {
        let extractedMCQsFromFile: MCQ[] = [];

        if (file.type === 'application/json') {
            const textContent = await file.text();
            try {
                const jsonData = JSON.parse(textContent);
                const validation = JsonUploadSchema.safeParse(jsonData);
                if (!validation.success) {
                    console.error("JSON validation error:", validation.error.flatten());
                    return NextResponse.json({ 
                        error: `Invalid JSON format in file: ${file.name}. It must be an object with an "mcqs" array matching the required structure.`, 
                        details: validation.error.flatten() 
                    }, { status: 400 });
                }
                extractedMCQsFromFile = validation.data.mcqs;
            } catch (e) {
                return NextResponse.json({ error: `Syntax error in JSON file: ${file.name}. Please check the file for errors like trailing commas.` }, { status: 400 });
            }

        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await mammoth.extractRawText({ buffer });
            const textContent = result.value;
            
            if (!textContent.trim()) {
                console.warn(`Could not extract any text from the DOCX file: ${file.name}`);
                continue; // Skip this file
            }
            
            extractedMCQsFromFile = await extractMCQsFromText(textContent, topicTitle);

        } else {
            console.warn(`Skipping unsupported file type: ${file.name}`);
            continue; // Skip this file
        }
        
        allExtractedMCQs.push(...extractedMCQsFromFile);
    }


    if (allExtractedMCQs.length === 0) {
        return NextResponse.json({ error: 'No valid MCQs could be extracted from the uploaded documents.' }, { status: 400 });
    }

    // Add sourceLanguage and an empty translations map to each MCQ if they don't exist
    const canonicalMCQs = allExtractedMCQs.map(mcq => ({
        ...mcq,
        sourceLanguage: mcq.sourceLanguage || 'English',
        translations: mcq.translations || {}
    }));
    
    const contentToStore = JSON.stringify({ mcqs: canonicalMCQs }, null, 2);
    
    const firstFileName = files[0].name.replace(/\.[^/.]+$/, "");
    const newFileName = files.length > 1 ? `${firstFileName}-and-more.json` : `${firstFileName}.json`;
    
    const newDocData: Omit<TopicMCQ, 'id'> = {
        topicId: topicId,
        fileName: newFileName,
        content: contentToStore,
        uploadedAt: new Date(),
    }
    
    // Check if a document for this topic already exists
    const existingDoc = (await getTopicMCQs(topicId))[0];
    
    if (existingDoc) {
        // Update the existing document
        await updateTopicMCQDocument(existingDoc.id, contentToStore, newFileName);
        const updatedDocument = { id: existingDoc.id, ...newDocData };
         return NextResponse.json({ 
            message: 'Topic MCQ document updated successfully.', 
            newDocument: updatedDocument
        });

    } else {
        // Create a new document
        const newDocRef = await addTopicMCQDocument(newDocData);
        const newDocument = { id: newDocRef.id, ...newDocData };
         return NextResponse.json({ 
            message: 'Topic MCQ document created successfully.', 
            newDocument
        });
    }

  } catch (error: any) {
    console.error('Error processing topic MCQ file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
