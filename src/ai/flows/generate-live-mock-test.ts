
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
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
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
    
    let parsedData: { questions: any[] };
    try {
        parsedData = JSON.parse(questionPaper.content);
    } catch (error) {
        console.error("Failed to parse question paper content as JSON:", error);
        throw new Error(`The question paper '${questionPaper.fileName}' is not in a valid JSON format. Please upload it again.`);
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error(`The live test question paper '${questionPaper.fileName}' is empty or incorrectly formatted. It must be a JSON object with a "questions" array.`);
    }

    const lang = input.language || 'English';
    const canonicalQuestions = parsedData.questions;
    
    let processedQuestions: MCQ[] = canonicalQuestions.map(q => {
        // Use English if selected, or if the language is not found in translations
        if (lang === 'English' || !q.translations || !q.translations[lang]) {
            return {
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                topic: q.topic,
                solution: q.solution,
            };
        }
        
        // Use the translated version from the nested object
        const translated = q.translations[lang];
        
        return {
            question: translated.question,
            options: translated.options,
            correctAnswer: translated.correctAnswer,
            topic: q.topic, // Topic remains the same across translations
            // Fallback to English solution if translated solution is not available
            solution: translated.solution || q.solution, 
        };
    });


    let finalMCQs = processedQuestions;
    
    let reasoningQuestionsNeeded = 0;
    if (input.examCategory === 'PA') {
        reasoningQuestionsNeeded = 10;
    } else if (input.examCategory === 'POSTMAN') {
        reasoningQuestionsNeeded = 5;
    }

    if (reasoningQuestionsNeeded > 0) {
        const reasoningQuestions = await getReasoningQuestionsForLiveTest(input.examCategory);
        
        if (reasoningQuestions.length < reasoningQuestionsNeeded) {
            throw new Error(`Could not find enough reasoning questions for the ${input.examCategory} live test. Found ${reasoningQuestions.length}, but need ${reasoningQuestionsNeeded}. Please upload more.`);
        }

        const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, reasoningQuestionsNeeded);
        
        const formattedReasoningMCQs: MCQ[] = selectedReasoning.map(q => ({
            question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: q.solutionText ? `${q.solutionText}${q.solutionImage ? `<br/><img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : ''}` : (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
            topic: 'Reasoning',
        }));
        
        finalMCQs = [...finalMCQs, ...formattedReasoningMCQs];
    }
    
    return { mcqs: finalMCQs };
  }
);
