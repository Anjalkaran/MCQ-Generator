
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */
import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getUserTopicProgress, updateUserTopicProgress, getTopicMCQs } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  category: z.string().optional().describe('The parent category of the topic.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  examCategory: z.string().optional().describe('The target exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.string().optional().describe('The part of the syllabus this topic belongs to (e.g., Part A, Part B).'),
  material: z.string().optional().describe('The study material for the topic, if available.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  topicId: z.string().describe('The ID of the topic.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
});
export type GenerateMCQsInput = z.infer<typeof GenerateMCQsInputSchema>;

const MCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty.").describe('The multiple-choice question text only. It must NOT contain the answer options.'),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4).describe('An array of four possible answers, with the full text for each option.'),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty.").describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
  solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
  topic: z.string().optional().describe("The specific topic of the question."),
});

const GenerateMCQsOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextPrompt',
    input: { schema: z.object({ textContent: z.string(), topicName: z.string(), numberOfQuestions: z.number(), language: z.string().optional().default('English') }) },
    output: { schema: GenerateMCQsOutputSchema },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).

Your task is to extract as many high-quality, unique questions as you can find from the 'TEXT CONTENT' provided below and format them according to the user's requested language.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  **Translate** the entire extracted content for each question into the specified '{{language}}'.
4.  For EACH extracted question, you MUST add a 'topic' field with the value "{{topicName}}".
5.  If a solution is not found for a question, the 'solution' field MUST be an empty string ("").

**CRITICAL INSTRUCTIONS:**
*   Do NOT verify, correct, or change any of the content. Extract it exactly as it appears in the text.
*   The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   **TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix from the option text before including it in the output. For example, "a. The quick brown fox" should become "The quick brown fox".
*   You MUST extract the actual text content for all fields. NEVER output the literal word "string" as a value for any field. Your goal is to extract up to {{numberOfQuestions}} questions if they are available in the text.

--- TEXT CONTENT ---
{{{textContent}}}
--- END TEXT CONTENT ---

Your final output must be a single, valid JSON object containing an 'mcqs' array with all the valid questions you were able to extract from the text.
`
});

const generateMCQsFromScratchPrompt = ai.definePrompt({
    name: 'generateMCQsFromScratchPrompt',
    input: {
        schema: z.object({
            topic: z.string(),
            examCategory: z.string().optional(),
            numberOfQuestions: z.number(),
            language: z.string().optional().default('English'),
        })
    },
    output: { schema: GenerateMCQsOutputSchema },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert in creating multiple-choice questions for the Indian Postal Department's {{examCategory}} exam.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

Your task is to generate EXACTLY **{{numberOfQuestions}}** unique questions based on the following topic:
**Topic: "{{topic}}"**

For each generated question:
1.  The 'question' must be clear and relevant to the topic.
2.  The 'options' array must contain four distinct and plausible answers.
3.  The 'correctAnswer' field must be an exact, case-sensitive match to one of the four options.
4.  The 'solution' field should provide a detailed step-by-step explanation for arithmetic problems, or a clear justification for general knowledge questions.
5.  The 'topic' field MUST be set to "{{topic}}".

Your final output MUST be a single, valid JSON object containing an 'mcqs' array with EXACTLY {{numberOfQuestions}} questions.
`,
});


const MATERIAL_CHUNK_SIZE = 4000;
let deferredFunctions: (() => Promise<any>)[] = [];

function defer(fn: () => Promise<any>) {
    deferredFunctions.push(fn);
}

async function runDeferred() {
    await Promise.all(deferredFunctions.map(fn => fn()));
    deferredFunctions = [];
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateMCQs(input: GenerateMCQsInput): Promise<GenerateMCQsOutput> {
  return generateMCQsFlow(input);
}

const generateMCQsFlow = ai.defineFlow(
  {
    name: 'generateMCQsFlow',
    inputSchema: GenerateMCQsInputSchema,
    outputSchema: GenerateMCQsOutputSchema,
  },
  async (input) => {
    if (!input.userId) {
      throw new Error("A user ID must be provided to generate a quiz.");
    }
    
    // **PRIORITY 1: Check for uploaded JSON files in the MCQ Bank**
    const uploadedMCQs = await getTopicMCQs(input.topicId);
    if (uploadedMCQs && uploadedMCQs.length > 0) {
        let canonicalQuestions: MCQ[] = [];
        uploadedMCQs.forEach(doc => {
            try {
                const parsedContent = JSON.parse(doc.content);
                if (parsedContent.mcqs && Array.isArray(parsedContent.mcqs)) {
                    canonicalQuestions.push(...parsedContent.mcqs);
                }
            } catch (error) {
                console.warn(`Could not parse JSON from document ${doc.fileName} for topic ${input.topic}`);
            }
        });
        
        if (canonicalQuestions.length < input.numberOfQuestions) {
            console.warn(`Could only find ${canonicalQuestions.length} questions in the uploaded files for topic "${input.topic}", though ${input.numberOfQuestions} were requested.`);
        }
        
        if (canonicalQuestions.length === 0) {
            throw new Error(`Failed to find any valid questions for "${input.topic}" in the uploaded MCQ Bank documents. Please upload a valid JSON file for this topic.`);
        }
        
        const finalMCQs = shuffleArray(canonicalQuestions).slice(0, input.numberOfQuestions);
        
        // TODO: Handle language translation if needed in a later step.
        // For now, it assumes the source JSON is in the desired language or English.

        return { mcqs: finalMCQs };

    // **PRIORITY 2: Fallback to generating from raw text material**
    } else if (input.material) {
        const totalLength = input.material.length;

        let collectedMCQs: z.infer<typeof MCQSchema>[] = [];
        const collectedQuestionTexts = new Set<string>();
        const userProgress = await getUserTopicProgress(input.userId, input.topicId);
        let currentIndex = userProgress?.lastCharacterIndexUsed || 0;
        
        const maxIterations = Math.ceil(totalLength / MATERIAL_CHUNK_SIZE) + 2; 
        
        for (let i = 0; i < maxIterations && collectedMCQs.length < input.numberOfQuestions; i++) {
            if (currentIndex >= totalLength) {
                currentIndex = 0;
            }

            const endIndex = Math.min(currentIndex + MATERIAL_CHUNK_SIZE, totalLength);
            const contentChunk = input.material.substring(currentIndex, endIndex);
            
            if (contentChunk.trim().length < 50) {
                if (currentIndex === 0 && i > 0) break; 
                currentIndex = endIndex;
                continue;
            }

            const { output: extractedOutput } = await extractMCQsFromTextPrompt({
                textContent: contentChunk,
                topicName: input.topic,
                numberOfQuestions: input.numberOfQuestions - collectedMCQs.length,
                language: input.language,
            });

            if (extractedOutput && extractedOutput.mcqs) {
                const validNewMcqs = extractedOutput.mcqs.filter(mcq => {
                    const questionText = mcq.question.trim();
                    const hasValidQuestion = questionText.toLowerCase() !== "string" && questionText.length > 1;
                    const hasValidOptions = mcq.options.every(opt => opt.trim().toLowerCase() !== "string" && opt.trim().length > 0);
                    const isNew = !collectedQuestionTexts.has(questionText);
                    return hasValidQuestion && hasValidOptions && isNew;
                });
                
                validNewMcqs.forEach(mcq => {
                    collectedMCQs.push(mcq);
                    collectedQuestionTexts.add(mcq.question.trim());
                });
            }
            
            currentIndex = endIndex;
        }

        let nextIndex = currentIndex >= totalLength ? 0 : currentIndex;
        defer(async () => {
            await updateUserTopicProgress(input.userId, input.topicId, nextIndex);
        });

        if (collectedMCQs.length < input.numberOfQuestions) {
            console.warn(`Could only find ${collectedMCQs.length} unique questions for topic "${input.topic}" after scanning the material, though ${input.numberOfQuestions} were requested.`);
        }
        
        if (collectedMCQs.length === 0) {
        throw new Error(`Failed to extract any valid questions for "${input.topic}". Please check the document formatting and content.`);
        }

        await runDeferred();
        
        const finalMCQs = shuffleArray(collectedMCQs).slice(0, input.numberOfQuestions);

        return { mcqs: finalMCQs };

    // **PRIORITY 3: Fallback to generating from scratch**
    } else {
        const { output } = await generateMCQsFromScratchPrompt({
            topic: input.topic,
            examCategory: input.examCategory,
            numberOfQuestions: input.numberOfQuestions,
            language: input.language,
        });

        if (!output || !output.mcqs || output.mcqs.length === 0) {
            throw new Error(`The AI failed to generate questions for the topic "${input.topic}". Please try again.`);
        }
        return { mcqs: output.mcqs };
    }
  }
);
