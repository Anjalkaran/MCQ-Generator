
'use server';

/**
 * @fileOverview Generates a mock test by selecting one JSON question paper and extracting its questions.
 * The number of questions selected is based on the exam blueprint to prevent document size errors.
 *
 * - generateMockTestFromBank - A function that handles the mock test generation process.
 * - GenerateMockTestFromBankInput - The input type for the function.
 * - GenerateMockTestFromBankOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankDocumentsByCategory, getReasoningQuestions } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';
import { getFirebaseDb } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { MTS_BLUEPRINT, PA_BLUEPRINT, POSTMAN_BLUEPRINT } from '@/lib/exam-blueprints';

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
};

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.enum(["MTS", "POSTMAN", "PA"]).describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
});
export type GenerateMockTestFromBankInput = z.infer<typeof GenerateMockTestFromBankInputSchema>;

const GenerateMockTestFromBankOutputSchema = z.object({
  quizId: z.string().describe('The ID of the generated quiz document in Firestore.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;


export async function generateMockTestFromBank(input: GenerateMockTestFromBankInput): Promise<GenerateMockTestFromBankOutput> {
  return generateMockTestFromBankFlow(input);
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
    
    const blueprint = blueprintMap[input.examCategory];
    const totalQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);

    let allAvailableMCQs = parsedData.questions;

    // Randomly select the correct number of questions based on the blueprint to ensure the document is under the 1MB limit.
    const finalMCQs = shuffleArray(allAvailableMCQs).slice(0, totalQuestions);

    if (finalMCQs.length < totalQuestions) {
        console.warn(`Selected paper has only ${finalMCQs.length} questions. Test will be shorter than the expected ${totalQuestions}.`);
    }

    const quizId = `mock-test-bank-${input.examCategory}-${Date.now()}`;
    const quizData = {
        mcqs: finalMCQs,
        timeLimit: blueprint.totalDurationMinutes * 60,
        isMockTest: true,
        language: input.language,
        topic: {
            id: quizId,
            title: `${blueprint.examName} Mock Test (Previous Year)`,
            description: `A mock test from the question bank file: ${selectedPaper.fileName}.`,
            icon: 'scroll-text',
            categoryId: 'mock-test-bank',
        },
    };
    
    const db = getFirebaseDb();
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    const docRef = await addDoc(collection(db, "generatedQuizzes"), quizData);

    return { quizId: docRef.id };
  }
);
