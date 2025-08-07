
'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint using questions from the MCQ bank with on-demand translation and caching.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ, ReasoningQuestion, Topic } from '@/lib/types';
import { getShuffledMCQsForTopics, getTopics, updateTopicMCQWithTranslation, getReasoningQuestionsForPartwiseTest, getTopicMCQs } from '@/lib/firestore';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/googleai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';


const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
});
export type GenerateMockTestInput = z.infer<typeof GenerateMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
});

const GenerateMockTestOutputSchema = z.object({
  quizId: z.string().describe('The ID of the generated quiz document in Firestore.'),
});
export type GenerateMockTestOutput = z.infer<typeof GenerateMockTestOutputSchema>;

// Dedicated, simple translation flow logic
const translateMCQ = async (mcq: MCQ, targetLanguage: string): Promise<MCQ> => {
    const prompt = `Translate the following JSON MCQ object to ${targetLanguage}.
      
      **CRITICAL RULE:** Keep all technical terms, names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", etc. Translate only the descriptive text around them.
      
      **SOURCE MCQ JSON:**
      ${JSON.stringify(mcq)}
      `;

    const result = await generate({
        model: gemini15Pro,
        prompt: prompt,
        output: {
            format: 'json',
            schema: zodToJsonSchema(MCQSchema) as any,
        },
        config: { temperature: 0.2 }
    });
    
    const translatedMcq = result.json();

    if (!translatedMcq) {
        throw new Error(`Failed to translate MCQ for topic: ${mcq.topic}`);
    }

    return translatedMcq as MCQ;
}


function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const generateMockTestFlow = ai.defineFlow(
  {
    name: 'generateMockTestFlow',
    inputSchema: GenerateMockTestInputSchema,
    outputSchema: GenerateMockTestOutputSchema,
  },
  async input => {
    let blueprint;
    if (input.examCategory === 'MTS') blueprint = MTS_BLUEPRINT;
    else if (input.examCategory === 'POSTMAN') blueprint = POSTMAN_BLUEPRINT;
    else if (input.examCategory === 'PA') blueprint = PA_BLUEPRINT;
    else throw new Error(`No blueprint found for exam category: ${input.examCategory}`);

    let allQuestions: MCQ[] = [];
    const allFirestoreTopics = await getTopics();
    const topicMapByName: Map<string, Topic> = new Map(allFirestoreTopics.map(t => [t.title.toLowerCase(), t]));
    
    const targetLang = input.language?.toLowerCase();
    const languageMap: Record<string, string> = { 'english': 'en', 'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te', 'kannada': 'kn' };
    const targetLangKey = targetLang ? languageMap[targetLang] : 'en';

    // --- New Resilient Fetching Logic ---
    const allMcqDocsForCategory = await getTopicMCQs();
    const allMcqsForCategory: (MCQ & { sourceDocId: string; topicId: string })[] = [];
    
    const categoryTopicIds = new Set(allFirestoreTopics.filter(t => t.examCategories.includes(input.examCategory as 'MTS' | 'POSTMAN' | 'PA')).map(t => t.id));

    allMcqDocsForCategory.forEach(doc => {
      if (categoryTopicIds.has(doc.topicId)) {
        try {
          const parsed = JSON.parse(doc.content);
          if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
            parsed.mcqs.forEach((mcq: any) => {
              allMcqsForCategory.push({ ...mcq, sourceDocId: doc.id, topicId: doc.topicId });
            });
          }
        } catch (e) { /* Ignore non-json files */ }
      }
    });


    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        
        if (section.sectionName.toLowerCase().includes("reasoning")) {
            const totalReasoningQuestions = section.questions || 0;
            if (totalReasoningQuestions > 0) {
                const reasoningQuestions = await getReasoningQuestionsForPartwiseTest(input.examCategory as 'MTS' | 'POSTMAN' | 'PA');
                if (reasoningQuestions.length < totalReasoningQuestions) {
                    throw new Error(`Not enough reasoning questions. Found ${reasoningQuestions.length}, but need ${totalReasoningQuestions}.`);
                }
                const selected = shuffleArray(reasoningQuestions).slice(0, totalReasoningQuestions);
                const formatted: MCQ[] = selected.map(q => ({
                     question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                    topic: q.topic,
                }));
                allQuestions.push(...formatted);
            }
            continue;
        }

        const topicRequests = new Map<string, number>();
        let randomFromRequest: { topics: string[], questions: number } | null = null;
        
        if (section.topics) {
             section.topics.forEach(topicDef => {
                const topicInfo = topicMapByName.get(topicDef.name.toLowerCase());
                if (topicInfo) {
                    topicRequests.set(topicInfo.id, topicDef.questions);
                } else {
                    console.warn(`Blueprint topic "${topicDef.name}" not found in Firestore. Skipping.`);
                }
            });
        }
        
        if (section.randomFrom) {
            const topicIds = section.randomFrom.topics
                .map(name => topicMapByName.get(name.toLowerCase())?.id)
                .filter(Boolean) as string[];
            
            randomFromRequest = { topics: topicIds, questions: section.randomFrom.questions };
        }
        
        const fetchedMCQs = await getShuffledMCQsForTopics(topicRequests, randomFromRequest, input.examCategory as 'MTS' | 'POSTMAN' | 'PA', allMcqsForCategory);
        allQuestions.push(...fetchedMCQs);
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((partSum, part) => {
        return partSum + part.sections.reduce((sectionSum, section) => {
            let count = 0;
            if (section.topics) {
                count += section.topics.reduce((topicSum, topic) => topicSum + topic.questions, 0);
            }
            if (section.randomFrom) {
                count += section.randomFrom.questions;
            }
            if (section.questions) {
                count += section.questions;
            }
            return sectionSum + count;
        }, 0);
    }, 0);

    // --- Fallback to fill any remaining shortfall ---
    let shortfall = totalExpectedQuestions - allQuestions.length;
    if (shortfall > 0) {
        console.warn(`Shortfall of ${shortfall} questions detected. Filling from general pool.`);
        const usedQuestionTexts = new Set(allQuestions.map(q => q.question));
        const fallbackPool = allMcqsForCategory.filter(mcq => !usedQuestionTexts.has(mcq.question));
        const fallbackQuestions = shuffleArray(fallbackPool).slice(0, shortfall);
        allQuestions.push(...fallbackQuestions);
    }

    if (allQuestions.length < totalExpectedQuestions) {
        throw new Error(`Failed to generate the full mock test. Could only gather ${allQuestions.length} out of ${totalExpectedQuestions} required questions. Please check the MCQ bank.`);
    }
    
    // Process translations for the final list
    const processedQuestions: MCQ[] = [];
    for (const cq of allQuestions) {
         let finalMcq: MCQ;
            if (targetLang === 'english' || !targetLangKey) {
                finalMcq = cq;
            } else if ((cq as any).translations && (cq as any).translations[targetLangKey]) {
                const translated = (cq as any).translations[targetLangKey];
                finalMcq = { ...cq, ...translated };
            } else if (input.language) {
                try {
                    const translatedMcq = await translateMCQ(cq, input.language);
                    updateTopicMCQWithTranslation((cq as any).sourceDocId, cq.question, targetLangKey, translatedMcq).catch(err => console.error("Failed to save translation:", err));
                    finalMcq = translatedMcq;
                } catch (e) {
                    console.error(`Skipping question due to translation error for topic ${cq.topic}:`, e);
                    finalMcq = cq; // Use original if translation fails
                }
            } else {
                finalMcq = cq;
            }
            const { translations, sourceLanguage, sourceDocId, topicId, ...rest } = finalMcq as any;
            processedQuestions.push(rest);
    }


    const finalMCQs = shuffleArray(processedQuestions).map(mcq => ({ ...mcq, solution: mcq.solution || "" }));

    const quizData = {
        mcqs: finalMCQs.slice(0, totalExpectedQuestions),
        timeLimit: blueprint.totalDurationMinutes * 60,
        isMockTest: true,
        topic: {
            id: `mock-test-${input.examCategory}-${Date.now()}`,
            title: `${blueprint.examName} Mock Test`,
            description: `A full-length mock test based on the official ${input.examCategory} syllabus.`,
            icon: 'scroll-text',
            categoryId: 'mock-test',
            part: 'Part A', 
            examCategories: [input.examCategory as 'MTS' | 'POSTMAN' | 'PA'],
        },
        createdAt: new Date(),
    };
    
    const db = getFirebaseDb();
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }

    const docRef = await addDoc(collection(db, "generatedQuizzes"), quizData);

    return { quizId: docRef.id };
  }
);
