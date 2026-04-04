
'use server';

/**
 * @fileOverview Generates a mock test by selecting one JSON question paper and extracting its questions.
 * Allows retaking papers if all have been completed.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankDocumentsByCategoryAdmin as getQuestionBankDocumentsByCategory, getUserDataAdmin as getUserData } from '@/lib/firestore-admin';
import type { MCQ } from '@/lib/types';
import { getFirebaseDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { MTS_BLUEPRINT, PA_BLUEPRINT, POSTMAN_BLUEPRINT, IP_BLUEPRINT, GROUPB_BLUEPRINT } from '@/lib/exam-blueprints';

const blueprintMap: Record<string, any> = {
    MTS: MTS_BLUEPRINT,
    POSTMAN: POSTMAN_BLUEPRINT,
    PA: PA_BLUEPRINT,
    IP: IP_BLUEPRINT,
    "GROUP B": GROUPB_BLUEPRINT,
};

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.enum(["MTS", "POSTMAN", "PA", "IP", "GROUP B"]).describe('The exam category (e.g., MTS, POSTMAN, PA, IP).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
  paperId: z.string().optional().describe('The ID of a specific paper to generate a test from.'),
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
    
    
    // Select the question paper
    let selectedPaper;
    if (input.paperId) {
        selectedPaper = allQuestionPapers.find(paper => paper.id === input.paperId);
        if (!selectedPaper) {
            throw new Error(`The selected question paper could not be found.`);
        }
    } else {
        // Randomly select one question paper
        selectedPaper = availablePapers[Math.floor(Math.random() * availablePapers.length)];
    }

    let questions: MCQ[] = [];
    try {
        const parsed = JSON.parse(selectedPaper.content);
        if (Array.isArray(parsed)) {
            questions = parsed;
        } else if (parsed.questions && Array.isArray(parsed.questions)) {
            questions = parsed.questions;
        } else if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
            questions = parsed.mcqs;
        }
    } catch (error) {
        console.error("Failed to parse question paper content as JSON:", error);
        throw new Error(`The question paper format is invalid.`);
    }

    if (questions.length === 0) {
        throw new Error(`The question paper is incorrectly formatted or contains no questions.`);
    }
    
    const blueprint = blueprintMap[input.examCategory];
    const totalQuestions = blueprint.parts.reduce((sum: number, part: any) => sum + part.totalQuestions, 0);

    // Randomly select the correct number of questions based on the blueprint
    const finalMCQs = shuffleArray(questions).slice(0, totalQuestions);

    const quizId = `mock-test-bank-${input.examCategory}-${Date.now()}`;
    const languageMap: Record<string, string> = {
        'tamil': 'ta',
        'hindi': 'hi',
        'telugu': 'te',
        'kannada': 'kn'
    };

    const quizData = {
        mcqs: finalMCQs.map(m => {
            // Pick translation if available and requested
            const lang = input.language || 'English';
            let finalQ = m.question || "";
            let finalOptions = m.options || [];
            let finalSolution = m.solution || "";

            if (lang !== 'English' && m.translations) {
                // Try full name key (e.g., "Tamil") and code key (e.g., "ta")
                const langKey = lang.toLowerCase();
                const langCode = languageMap[langKey];
                
                const t = m.translations[lang] || 
                          (langCode ? m.translations[langCode] : null) ||
                          m.translations[langKey];
                
                if (t) {
                    if (t.question) finalQ = t.question;
                    if (t.options && t.options.length > 0) finalOptions = t.options;
                    if (t.solution) finalSolution = t.solution;
                }
            }

            return {
                question: finalQ,
                options: finalOptions,
                correctAnswer: m.correctAnswer || "", // Answer key is same across languages
                topic: m.topic || "",
                solution: finalSolution
            };
        }),
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
