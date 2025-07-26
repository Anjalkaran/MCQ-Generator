
'use server';

/**
 * @fileOverview Generates a live mock test by fetching a specific question paper and verifying its answers.
 *
 * - generateLiveMockTest - A function that handles the live mock test generation process.
 * - GenerateLiveMockTestInput - The input type for the function.
 * - GenerateLiveMockTestOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { MCQ } from '@/lib/types';
import { getLiveTestQuestionPaper, getTopics } from '@/lib/firestore';

const GenerateLiveMockTestInputSchema = z.object({
  liveTestId: z.string().describe('The ID of the live test paper document in Firestore.'),
  language: z.string().optional().default('English').describe('The language for the generated test (e.g., "English", "Tamil", "Hindi").'),
});
export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available from verification.'),
});

const GenerateLiveMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateLiveMockTestOutput = z.infer<typeof GenerateLiveMockTestOutputSchema>;

const verifyAndFormatQuestionPaperPrompt = ai.definePrompt({
    name: 'verifyAndFormatLiveTestPaperPrompt',
    input: {
        schema: z.object({
            questionPaperContent: z.string(),
            studyMaterial: z.string(),
            language: z.string().optional().default('English'),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Processor for the Indian Postal Department exams.

Your task is to process the 'QUESTION PAPER' provided below and output a clean, translated, and formatted list of EXACTLY 50 questions in JSON format.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution' (if generated), MUST be in {{{language}}}. Every single field must be in the requested language.**
**IMPORTANT RULE FOR TAMIL/HINDI:** When translating to Tamil or Hindi, you MUST keep all technical postal terms, scheme names, and abbreviations (e.g., "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office") in English.

**Process:**

1.  **Read and Parse:** Go through the entire 'QUESTION PAPER' text and identify all 50 multiple-choice questions. For each question, you MUST extract the full text of the question and the **full text for all four of its options**.
2.  **Verify & Assign Topic:**
    *   For each question, use the 'STUDY MATERIAL' to verify the correct answer. The 'correctAnswer' field in the output must contain the full, correct option text from the translated options.
    *   Assign its specific topic from the study material (e.g., "Profit and loss", "Methods of address") and specify it in the 'topic' field.
    *   If a question seems ambiguous, make a reasonable interpretation based on the study material rather than skipping it. Your goal is to produce 50 questions.

**Content Sources:**

--- STUDY MATERIAL (Primary Source of Truth) ---
{{{studyMaterial}}}
--- END STUDY MATERIAL ---

--- QUESTION PAPER ---
{{{questionPaperContent}}}
--- END QUESTION PAPER ---

**CRITICAL INSTRUCTIONS:**
*   Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY 50 questions.
*   Do NOT skip questions. Process all 50 questions from the source paper.
*   The 'options' array for each question MUST contain four strings, each being the complete text of an answer option.
*   Do NOT invent new questions. All questions must originate from the 'QUESTION PAPER'.
`,
});


export async function generateLiveMockTest(input: GenerateLiveMockTestInput): Promise<GenerateLiveMockTestOutput> {
  return generateLiveMockTestFlow(input);
}

const generateLiveMockTestFlow = ai.defineFlow(
  {
    name: 'generateLiveMockTestFlow',
    inputSchema: GenerateLiveMockTestInputSchema,
    outputSchema: GenerateLiveMockTestOutputSchema,
  },
  async input => {
    
    const [questionPaper, allTopics] = await Promise.all([
        getLiveTestQuestionPaper(input.liveTestId),
        getTopics()
    ]);
    
    if (!questionPaper) {
        throw new Error(`The live test question paper (${input.liveTestId}) could not be found. Please contact an administrator.`);
    }

    // Combine all study material from all topics into one string
    const allStudyMaterial = allTopics.map(t => `Topic: ${t.title}\nMaterial: ${t.material || 'N/A'}`).join('\n\n---\n\n');
    
    const { output } = await verifyAndFormatQuestionPaperPrompt({
        questionPaperContent: questionPaper.content,
        studyMaterial: allStudyMaterial,
        language: input.language,
    });
    
    if (!output || !output.questions || output.questions.length === 0) {
        throw new Error(`The live test question paper '${questionPaper.fileName}' could not be processed. It might be empty, in an incorrect format, or the AI model is currently unavailable. Please try again later or contact an administrator.`);
    }

    return { mcqs: output.questions };
  }
);
