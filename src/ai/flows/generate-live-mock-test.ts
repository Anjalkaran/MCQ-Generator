
'use server';

/**
 * @fileOverview Generates a live mock test by fetching a specific question paper and extracting its questions.
 *
 * - generateLiveMockTest - A function that handles the live mock test generation process.
 * - GenerateLiveMockTestInput - The input type for the function.
 * - GenerateLiveMockTestOutput - The return type for the function.
 */

import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { MCQ } from '@/lib/types';
import { getLiveTestQuestionPaper, getReasoningQuestionsForLiveTest } from '@/lib/firestore';

const GenerateLiveMockTestInputSchema = z.object({
  liveTestId: z.string().describe('The ID of the live test paper document in Firestore.'),
  examCategory: z.enum(["MTS", "POSTMAN", "PA"]).describe('The exam category for which the test is being generated.'),
});
export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().optional().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available from the source text.'),
});

const GenerateLiveMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateLiveMockTestOutput = z.infer<typeof GenerateLiveMockTestOutputSchema>;

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
    
    const questionPaper = await getLiveTestQuestionPaper(input.liveTestId);
    
    if (!questionPaper) {
        throw new Error(`The live test question paper (${input.liveTestId}) could not be found. Please contact an administrator.`);
    }
    
    let parsedData: { questions: MCQ[] };
    try {
        parsedData = JSON.parse(questionPaper.content);
    } catch (error) {
        console.error("Failed to parse question paper content as JSON:", error);
        throw new Error(`The question paper '${questionPaper.fileName}' is not in a valid JSON format. Please upload it again.`);
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error(`The live test question paper '${questionPaper.fileName}' is empty or incorrectly formatted. It must be a JSON object with a "questions" array.`);
    }

    let finalMCQs = parsedData.questions;
    
    // For PA exam, fetch and append reasoning questions
    if (input.examCategory === 'PA') {
        const reasoningQuestions = await getReasoningQuestionsForLiveTest(input.examCategory);
        if (reasoningQuestions.length < 10) {
            throw new Error(`Could not find enough reasoning questions for the PA live test. Found ${reasoningQuestions.length}, but need 10. Please upload more.`);
        }

        // Shuffle and pick 10 random questions
        const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        
        const formattedReasoningMCQs: MCQ[] = selectedReasoning.map(q => ({
            question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
            topic: 'Reasoning',
        }));
        
        finalMCQs = [...finalMCQs, ...formattedReasoningMCQs];
    }
    
    return { mcqs: finalMCQs };
  }
);
