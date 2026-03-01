
'use server';

/**
 * @fileOverview Generates a live mock test by fetching a specific question paper and extracting its questions.
 *
 * - generateLiveMockTest - A function that handles the live mock test generation process.
 * - GenerateLiveMockTestInput - The input type for the function.
 * - GenerateLiveMockTestOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { MCQ } from '@/lib/types';
import { getLiveTestQuestionPaper, getReasoningQuestions } from '@/lib/firestore';
import { MTS_BLUEPRINT, PA_BLUEPRINT, POSTMAN_BLUEPRINT, IP_BLUEPRINT } from '@/lib/exam-blueprints';
import { getFirebaseDb } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
    IP: IP_BLUEPRINT,
};


const GenerateLiveMockTestInputSchema = z.object({
  liveTestId: z.string().optional().describe('The ID of the scheduled live test document in Firestore.'),
  weeklyTestId: z.string().optional().describe('The ID of the permanent weekly test document in Firestore.'),
  questionPaperId: z.string().describe('The ID of the question paper document in the liveTestBank collection.'),
  examCategory: z.enum(["MTS", "POSTMAN", "PA", "IP"]).describe('The exam category for which the test is being generated.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
  testTitle: z.string().describe('The title of the live test.'),
});
export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

const GenerateLiveMockTestOutputSchema = z.object({
  quizId: z.string().describe('The ID of the generated quiz document in Firestore.'),
});
export type GenerateLiveMockTestOutput = z.infer<typeof GenerateLiveMockTestOutputSchema>;

export async function generateLiveMockTest(input: GenerateLiveMockTestInput): Promise<GenerateLiveMockTestOutput> {
  return generateLiveMockTestFlow(input);
}

const languageMap: Record<string, string> = {
    'tamil': 'ta',
    'hindi': 'hi',
    'telugu': 'te',
    'kannada': 'kn'
};

const generateLiveMockTestFlow = ai.defineFlow(
  {
    name: 'generateLiveMockTestFlow',
    inputSchema: GenerateLiveMockTestInputSchema,
    outputSchema: GenerateLiveMockTestOutputSchema,
  },
  async input => {
    
    const questionPaper = await getLiveTestQuestionPaper(input.questionPaperId);
    
    if (!questionPaper) {
        throw new Error(`The live test question paper (${input.questionPaperId}) could not be found. Please contact an administrator.`);
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

    const canonicalQuestions = parsedData.questions;
    
    let processedQuestions: MCQ[] = canonicalQuestions.map(q => {
        if (input.language && input.language.toLowerCase() !== 'english') {
            const langKey = languageMap[input.language.toLowerCase()];
            if (langKey && q.translations?.[langKey]) {
                const translated = q.translations[langKey];
                return {
                    ...q,
                    ...translated,
                    question: translated.question,
                    options: translated.options,
                    correctAnswer: translated.correctAnswer,
                    solution: translated.solution,
                };
            }
        }
        return {
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            topic: q.topic,
            solution: q.solution,
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
        const reasoningQuestions = await getReasoningQuestions();
        
        if (reasoningQuestions.length < reasoningQuestionsNeeded) {
            throw new Error(`Could not find enough reasoning questions for the ${input.examCategory} live test. Found ${reasoningQuestions.length}, but need ${reasoningQuestionsNeeded}. Please upload more.`);
        }

        const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, reasoningQuestionsNeeded);
        
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
    const quizId = `live-test-${input.liveTestId || input.weeklyTestId || Date.now()}-${Date.now()}`;
    const quizData = {
        mcqs: finalMCQs,
        timeLimit: blueprint.totalDurationMinutes * 60,
        isMockTest: true,
        liveTestId: input.liveTestId,
        weeklyTestId: input.weeklyTestId,
        examCategory: input.examCategory,
        language: input.language,
        topic: {
            id: quizId,
            title: input.testTitle,
            description: `Weekly mock test.`,
            icon: 'scroll-text',
            categoryId: 'live-mock-test',
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
