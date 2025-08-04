
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { addTopicMCQDocument, updateTopicMCQDocument, getTopicMCQs } from '@/lib/firestore';
import type { TopicMCQ, MCQ } from '@/lib/types';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/googleai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const runtime = 'nodejs';
export const maxDuration = 300; 

// Base MCQ Schema without translations for recursive use
const BaseMCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty."),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty."),
  solution: z.string().optional(),
  topic: z.string().optional(),
});

// Main MCQ Schema that includes translations, which can be recursive
const MCQSchema: z.ZodType<MCQ> = BaseMCQSchema.extend({
  sourceLanguage: z.string().optional().default('English'),
  translations: z.lazy(() => z.record(MCQSchema)).optional(),
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
    
    const existingDocs = await getTopicMCQs(topicId);
    let combinedMCQs: MCQ[] = [...allExtractedMCQs];
    let targetDocId: string | undefined = undefined;

    if (existingDocs.length > 0) {
        targetDocId = existingDocs[0].id; // We'll update the first existing document
        try {
            const existingContent = JSON.parse(existingDocs[0].content);
            if (existingContent.mcqs && Array.isArray(existingContent.mcqs)) {
                // Prepend existing questions to the new ones
                combinedMCQs = [...existingContent.mcqs, ...allExtractedMCQs];
            }
        } catch (e) {
            console.warn(`Could not parse existing MCQ content for topic ${topicId}. It will be overwritten.`);
        }
    }
    
    // Simple deduplication based on the question text
    const uniqueMCQs = Array.from(new Map(combinedMCQs.map(mcq => [mcq.question, mcq])).values());
    
    const contentToStore = JSON.stringify({ mcqs: uniqueMCQs }, null, 2);
    
    const firstFileName = files[0].name.replace(/\.[^/.]+$/, "");
    const newFileName = files.length > 1 ? `${firstFileName}-and-more.json` : `${firstFileName}.json`;
    
    const docData: Omit<TopicMCQ, 'id'> = {
        topicId: topicId,
        fileName: newFileName,
        content: contentToStore,
        uploadedAt: new Date(),
    }
    
    if (targetDocId) {
        await updateTopicMCQDocument(targetDocId, contentToStore, newFileName);
        const updatedDocument = { id: targetDocId, ...docData };
         return NextResponse.json({ 
            message: `Topic MCQ document updated successfully with ${allExtractedMCQs.length} new question(s).`, 
            newDocument: updatedDocument
        });

    } else {
        const newDocRef = await addTopicMCQDocument(docData);
        const newDocument = { id: newDocRef.id, ...docData };
         return NextResponse.json({ 
            message: `Topic MCQ document created successfully with ${allExtractedMCQs.length} question(s).`,
            newDocument
        });
    }

  } catch (error: any) {
    console.error('Error processing topic MCQ file:', error);
    return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
  }
}
