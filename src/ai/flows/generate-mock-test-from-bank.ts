
'use server';

/**
 * @fileOverview Generates a mock test by selecting one question paper and verifying its answers.
 *
 * - generateMockTestFromBank - A function that handles the mock test generation process.
 * - GenerateMockTestFromBankInput - The input type for the function.
 * - GenerateMockTestFromBankOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { MCQ } from '@/lib/types';
import { getQuestionBankDocumentsByCategory, getTopics } from '@/lib/firestore';

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.enum(["MTS", "POSTMAN", "PA"]).describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
});
export type GenerateMockTestFromBankInput = z.infer<typeof GenerateMockTestFromBankInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available from verification.'),
});

const GenerateMockTestFromBankOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;

const verifyAndFormatQuestionPaperPrompt = ai.definePrompt({
    name: 'verifyAndFormatQuestionPaperPrompt',
    input: {
        schema: z.object({
            questionPaperContent: z.string(),
            studyMaterial: z.string(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Verifier for the Indian Postal Department exams.

Your task is to process the entire 'QUESTION PAPER' provided below, verify each question against the 'STUDY MATERIAL', and output a clean, verified list of questions in JSON format.

**Process:**

1.  **Read and Parse:** Go through the entire 'QUESTION PAPER' text and identify all the multiple-choice questions. For each question, you MUST extract the full text of the question and the **full text for all four of its options**.
2.  **Verify & Correct:**
    *   For each question found, you MUST use the 'STUDY MATERIAL' as the single source of truth to verify the correct answer.
    *   If the answer in the question paper is correct, keep it.
    *   If the answer is INCORRECT, you MUST correct it based on the study material. The 'correctAnswer' field in the output must contain the full, correct option text.
    *   If a question cannot be verified or its answer is ambiguous from the material, SKIP that question entirely.
3.  **Assign Topic:** For each verified question, identify its specific topic from the study material (e.g., "Profit and loss", "Methods of address") and specify it in the 'topic' field.

**Content Sources:**

--- STUDY MATERIAL (Primary Source of Truth) ---
{{{studyMaterial}}}
--- END STUDY MATERIAL ---

--- QUESTION PAPER ---
{{{questionPaperContent}}}
--- END QUESTION PAPER ---

**CRITICAL INSTRUCTIONS:**
*   Your final output MUST be a single, valid JSON object containing a 'questions' array.
*   The 'questions' array must only contain questions that you could successfully verify against the study material.
*   The 'options' array for each question MUST contain four strings, each being the complete text of an answer option.
*   Do NOT invent new questions. All questions must originate from the 'QUESTION PAPER'.
`,
});


export async function generateMockTestFromBank(input: GenerateMockTestFromBankInput): Promise<GenerateMockTestFromBankOutput> {
  return generateMockTestFromBankFlow(input);
}

const generateMockTestFromBankFlow = ai.defineFlow(
  {
    name: 'generateMockTestFromBankFlow',
    inputSchema: GenerateMockTestFromBankInputSchema,
    outputSchema: GenerateMockTestFromBankOutputSchema,
  },
  async input => {
    
    const [questionPapers, allTopics] = await Promise.all([
        getQuestionBankDocumentsByCategory(input.examCategory),
        getTopics()
    ]);
    
    if (!questionPapers || questionPapers.length === 0) {
        throw new Error(`No question papers found for exam category: ${input.examCategory}. Please upload some documents.`);
    }

    // Combine all study material from all topics into one string
    const allStudyMaterial = allTopics.map(t => `Topic: ${t.title}\nMaterial: ${t.material || 'N/A'}`).join('\n\n---\n\n');
    
    // Randomly select one question paper to process
    const selectedPaper = questionPapers[Math.floor(Math.random() * questionPapers.length)];

    const { output } = await verifyAndFormatQuestionPaperPrompt({
        questionPaperContent: selectedPaper.content,
        studyMaterial: allStudyMaterial,
    });
    
    if (!output || !output.questions || output.questions.length === 0) {
        throw new Error(`Could not extract any verifiable questions from the selected paper: ${selectedPaper.fileName}.`);
    }

    return { mcqs: output.questions };
  }
);
