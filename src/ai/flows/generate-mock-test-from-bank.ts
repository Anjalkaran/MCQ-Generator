
'use server';

/**
 * @fileOverview Generates a mock test by selecting one JSON question paper and extracting its questions.
 * If the paper has fewer than 100 questions, it's supplemented with reasoning questions.
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

    let finalMCQs = parsedData.questions;
    const questionsNeeded = 100 - finalMCQs.length;

    if (questionsNeeded > 0) {
        const reasoningQuestions = await getReasoningQuestions();
        if (reasoningQuestions.length < questionsNeeded) {
            throw new Error(`Could not find enough reasoning questions to supplement the test. Found ${reasoningQuestions.length}, but need ${questionsNeeded}.`);
        }

        const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, questionsNeeded);

        const formattedReasoningMCQs: MCQ[] = selectedReasoning.map(q => ({
            question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: q.solutionText ? `${q.solutionText}${q.solutionImage ? `<br/><img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : ''}` : (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : ""),
            topic: 'Reasoning',
        }));

        finalMCQs = [...finalMCQs, ...formattedReasoningMCQs];
    }


    const blueprint = blueprintMap[input.examCategory];
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
