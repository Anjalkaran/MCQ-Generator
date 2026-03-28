
'use server';

/**
 * @fileOverview Generates a mock test by selecting one JSON question paper and extracting its questions.
 * Allows retaking papers if all have been completed.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankDocumentsByCategory, getUserData } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';
import { getFirebaseDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
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
    
    const allQuestionPapers = await getQuestionBankDocumentsByCategory(input.examCategory);
    
    if (!allQuestionPapers || allQuestionPapers.length === 0) {
        throw new Error(`No question papers found for exam category: ${input.examCategory}. Please check back later.`);
    }

    // Fetch user data to see which tests they have already completed
    const userData = await getUserData(input.userId);
    const completedTestIds = new Set(userData?.completedMockBankTests || []);
    
    // Attempt to filter out papers the user has already taken
    let availablePapers = allQuestionPapers.filter(paper => !completedTestIds.has(paper.id));
    
    // If user has completed ALL papers, recycle them so they can practice again
    if (availablePapers.length === 0) {
        availablePapers = allQuestionPapers;
    }
    
    // Randomly select one question paper
    const selectedPaper = availablePapers[Math.floor(Math.random() * availablePapers.length)];

    let parsedData: { questions: MCQ[] };
    try {
        parsedData = JSON.parse(selectedPaper.content);
    } catch (error) {
        console.error("Failed to parse question paper content as JSON:", error);
        throw new Error(`The question paper format is invalid.`);
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error(`The question paper is incorrectly formatted.`);
    }
    
    const blueprint = blueprintMap[input.examCategory];
    const totalQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);

    let allAvailableMCQs = parsedData.questions;

    // Randomly select the correct number of questions based on the blueprint
    const finalMCQs = shuffleArray(allAvailableMCQs).slice(0, totalQuestions);

    const quizId = `mock-test-bank-${input.examCategory}-${Date.now()}`;
    const quizData = {
        mcqs: finalMCQs.map(m => ({
            question: m.question || "",
            options: m.options || [],
            correctAnswer: m.correctAnswer || "",
            topic: m.topic || "",
            solution: m.solution || ""
        })),
        timeLimit: Math.floor((blueprint?.totalDurationMinutes || 60) * 60),
        isMockTest: true,
        questionPaperId: selectedPaper.id, 
        language: input.language,
        topic: {
            id: quizId,
            title: `${blueprint?.examName || input.examCategory} Previous Year Paper`,
            description: `Practice session using a past exam paper.`,
            icon: 'scroll-text',
            categoryId: 'mock-test-bank',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const db = getFirebaseDb();
    const docRef = await db.collection("generatedQuizzes").add(quizData);

    return { quizId: docRef.id };
  }
);
