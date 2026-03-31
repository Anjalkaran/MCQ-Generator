'use server';

/**
 * @fileOverview Generates a mock test by extracting questions and sanitizing optional fields.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { MCQ } from '@/lib/types';
import { getLiveTestQuestionPaper } from '@/lib/firestore';
import { MTS_BLUEPRINT, PA_BLUEPRINT, POSTMAN_BLUEPRINT, IP_BLUEPRINT } from '@/lib/exam-blueprints';
import { getFirebaseDb, admin } from '@/lib/firebase-admin';

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
    IP: IP_BLUEPRINT,
};

const GenerateLiveMockTestInputSchema = z.object({
  liveTestId: z.string().optional().describe('ID of scheduled test.'),
  weeklyTestId: z.string().optional().describe('ID of permanent weekly test.'),
  dailyTestId: z.string().optional().describe('ID of permanent daily test.'),
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
    const db = getFirebaseDb();
    const questionPaperSnap = await db.collection('liveTestBank').doc(input.questionPaperId).get();
    const questionPaper = questionPaperSnap.exists ? questionPaperSnap.data() : null;
    if (!questionPaper) throw new Error(`The question paper could not be found.`);
    
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
    
    const processedQuestions: MCQ[] = parsedData.questions
        .filter(q => q && q.question && q.options && Array.isArray(q.options))
        .map(q => {
            const base = {
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                topic: q.topic || "",
                solution: q.solution || "",
            };

            if (langKey && q.translations?.[langKey]) {
                const translated = q.translations[langKey];
                return {
                    question: translated.question || base.question,
                    options: translated.options || base.options,
                    correctAnswer: translated.correctAnswer || base.correctAnswer,
                    solution: translated.solution || base.solution || "",
                    topic: base.topic,
                };
            }
            return base;
        });

    if (processedQuestions.length === 0) throw new Error("No valid questions found in this paper.");
    
    const blueprint = (blueprintMap as any)[input.examCategory];
    const quizId = `test-${Date.now()}`;
    
    const quizData: any = {
        mcqs: processedQuestions,
        timeLimit: Math.floor((blueprint?.totalDurationMinutes || 60) * 60),
        isMockTest: true,
        examCategory: input.examCategory,
        language: input.language,
        questionPaperId: input.questionPaperId,
        topic: {
            id: quizId,
            title: input.testTitle,
            description: `Full practice test.`,
            icon: 'scroll-text',
            categoryId: 'weekly-test',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (input.liveTestId) quizData.liveTestId = input.liveTestId;
    if (input.weeklyTestId) quizData.weeklyTestId = input.weeklyTestId;
    if (input.dailyTestId) quizData.dailyTestId = input.dailyTestId;

    const docRef = await db.collection("generatedQuizzes").add(quizData);
    return { quizId: docRef.id };
  }
);