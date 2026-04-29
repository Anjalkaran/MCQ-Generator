'use server';

/**
 * @fileOverview Generates a mock test by extracting questions and sanitizing optional fields.
 */

import { z } from 'zod';
import type { MCQ } from '@/lib/types';
import { MTS_BLUEPRINT, PA_BLUEPRINT, POSTMAN_BLUEPRINT, IP_BLUEPRINT, GROUPB_BLUEPRINT } from '@/lib/exam-blueprints';
import { getFirebaseDb, admin } from '@/lib/firebase-admin';
import { shuffleArray } from '@/lib/utils';

const blueprintMap = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
    IP: IP_BLUEPRINT,
    "GROUP B": GROUPB_BLUEPRINT,
};

const languageMap: Record<string, string> = {
    'tamil': 'ta',
    'hindi': 'hi',
    'telugu': 'te',
    'kannada': 'kn'
};

const GenerateLiveMockTestInputSchema = z.object({
  liveTestId: z.string().optional().describe('ID of scheduled test.'),
  weeklyTestId: z.string().optional().describe('ID of permanent weekly test.'),
  dailyTestId: z.string().optional().describe('ID of permanent daily test.'),
  questionPaperId: z.string().describe('ID of the paper in liveTestBank.'),
  examCategory: z.enum(["MTS", "POSTMAN", "PA", "IP", "GROUP B"]).describe('Target course.'),
  language: z.string().optional().default('English').describe('Selected language.'),
  testTitle: z.string().describe('Display title.'),
  duration: z.number().optional().describe('Custom duration in minutes.'),
});

export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

export type GenerateLiveMockTestOutput = {
  quizId: string;
};

export async function generateLiveMockTest(input: GenerateLiveMockTestInput): Promise<GenerateLiveMockTestOutput> {
    const validatedInput = GenerateLiveMockTestInputSchema.parse(input);

    const db = getFirebaseDb();
    const questionPaperSnap = await db.collection('liveTestBank').doc(validatedInput.questionPaperId).get();
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

            const lang = validatedInput.language || 'English';
            const langKey = lang.toLowerCase();
            const langCode = languageMap[langKey];
            
            const t = q.translations && (
                q.translations[lang] || 
                (langCode ? q.translations[langCode] : null) ||
                q.translations[langKey]
            );

            if (t) {
                return {
                    question: t.question || base.question,
                    options: (t.options && t.options.length > 0) ? t.options : base.options,
                    correctAnswer: t.correctAnswer || base.correctAnswer,
                    solution: t.solution || base.solution || "",
                    topic: base.topic,
                };
            }
            return base;
        });

    if (processedQuestions.length === 0) throw new Error("No valid questions found in this paper.");
    
    const blueprint = (blueprintMap as any)[validatedInput.examCategory];
    const quizId = `test-${Date.now()}`;
    
    // Set time limit: Input duration (mins) > Blueprint duration > Default 60 mins
    const timeLimitInSeconds = validatedInput.duration 
        ? validatedInput.duration * 60 
        : (blueprint?.totalDurationMinutes || 60) * 60;

    // Shuffle both questions and their options
    const randomizedQuestions = shuffleArray(processedQuestions.map(q => ({
        ...q,
        options: shuffleArray([...q.options])
    })));

    const quizData: any = {
        mcqs: randomizedQuestions,
        timeLimit: timeLimitInSeconds,
        isMockTest: true,
        examCategory: validatedInput.examCategory,
        language: validatedInput.language,
        questionPaperId: validatedInput.questionPaperId,
        topic: {
            id: quizId,
            title: validatedInput.testTitle,
            description: `Full practice test.`,
            icon: 'scroll-text',
            categoryId: 'weekly-test',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (validatedInput.liveTestId) quizData.liveTestId = validatedInput.liveTestId;
    if (validatedInput.weeklyTestId) quizData.weeklyTestId = validatedInput.weeklyTestId;
    if (validatedInput.dailyTestId) quizData.dailyTestId = validatedInput.dailyTestId;

    const docRef = await db.collection("generatedQuizzes").add(quizData);
    return { quizId: docRef.id };
}
