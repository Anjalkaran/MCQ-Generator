'use server';

/**
 * @fileOverview Generates a mock test (Weekly or Live) by fetching a question paper and extracting questions.
 * Supports the user's specific translation format (ta, hi, te, kn).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { MCQ } from '@/lib/types';
import { getLiveTestQuestionPaper } from '@/lib/firestore';
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
  liveTestId: z.string().optional().describe('ID of scheduled test.'),
  weeklyTestId: z.string().optional().describe('ID of permanent weekly test.'),
  questionPaperId: z.string().describe('ID of the paper in liveTestBank.'),
  examCategory: z.enum(["MTS", "POSTMAN", "PA", "IP"]).describe('Target course.'),
  language: z.string().optional().default('English').describe('Selected language.'),
  testTitle: z.string().describe('Display title.'),
});
export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

const GenerateLiveMockTestOutputSchema = z.object({
  quizId: z.string().describe('Firestore ID of the generated quiz.'),
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
        throw new Error(`The question paper could not be found.`);
    }
    
    let parsedData: { questions: any[] };
    try {
        parsedData = JSON.parse(questionPaper.content);
    } catch (error) {
        throw new Error(`The question paper format is invalid JSON.`);
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error(`The question paper is empty or incorrectly formatted.`);
    }

    const langKey = languageMap[input.language.toLowerCase()];
    
    // Extract questions and apply translations if matching key is found
    const processedQuestions: MCQ[] = parsedData.questions.map(q => {
        if (langKey && q.translations?.[langKey]) {
            const translated = q.translations[langKey];
            return {
                question: translated.question || q.question,
                options: translated.options || q.options,
                correctAnswer: translated.correctAnswer || q.correctAnswer,
                solution: translated.solution || q.solution,
                topic: q.topic,
            };
        }
        return {
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            topic: q.topic,
            solution: q.solution,
        };
    });

    const finalMCQs = processedQuestions;
    if (finalMCQs.length === 0) {
        throw new Error("No questions found in this paper.");
    }
    
    const blueprint = blueprintMap[input.examCategory];
    const quizId = `weekly-test-${Date.now()}`;
    
    const quizData: any = {
        mcqs: finalMCQs,
        timeLimit: (blueprint?.totalDurationMinutes || 60) * 60,
        isMockTest: true,
        examCategory: input.examCategory,
        language: input.language,
        questionPaperId: input.questionPaperId,
        topic: {
            id: quizId,
            title: input.testTitle,
            description: `A full mock test.`,
            icon: 'scroll-text',
            categoryId: 'weekly-test',
        },
    };

    if (input.liveTestId) quizData.liveTestId = input.liveTestId;
    if (input.weeklyTestId) quizData.weeklyTestId = input.weeklyTestId;

    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized.");
    
    const docRef = await addDoc(collection(db, "generatedQuizzes"), quizData);
    return { quizId: docRef.id };
  }
);
