
'use server';

/**
 * @fileOverview Generates a mock test by selecting one JSON question paper and extracting its questions.
 *
 * - generateMockTestFromBank - A function that handles the mock test generation process.
 * - GenerateMockTestFromBankInput - The input type for the function.
 * - GenerateMockTestFromBankOutput - The return type for the function.
 */

import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankDocumentsByCategory } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.enum(["MTS", "POSTMAN", "PA"]).describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
});
export type GenerateMockTestFromBankInput = z.infer<typeof GenerateMockTestFromBankInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().optional().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available.'),
});

const GenerateMockTestFromBankOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;


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
    
    const questionPapers = await getQuestionBankDocumentsByCategory(input.examCategory);
    
    if (!questionPapers || questionPapers.length === 0) {
        throw new Error(`No question papers found for exam category: ${input.examCategory}. Please upload some JSON documents.`);
    }
    
    // Randomly select one question paper to process
    const selectedPaper = questionPapers[Math.floor(Math.random() * questionPapers.length)];

    let parsedData: { questions: MCQ[] };
    try {
        parsedData = JSON.parse(selectedPaper.content);
    } catch (error) {
        console.error("Failed to parse question paper content as JSON:", error);
        throw new Error(`The question paper '${selectedPaper.fileName}' is not in a valid JSON format. Please check and upload it again.`);
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error(`The question paper '${selectedPaper.fileName}' is empty or incorrectly formatted. It must be a JSON object with a "questions" array.`);
    }

    return { mcqs: parsedData.questions };
  }
);
