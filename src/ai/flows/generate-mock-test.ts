'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint using questions from the MCQ bank with batched translation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT, IP_BLUEPRINT, GROUPB_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ, Topic } from '@/lib/types';
import { getTopicsAdmin, getTopicMCQsAdmin, getReasoningQuestionsAdmin, getSyllabiAdmin } from '@/lib/firestore-admin';

import { getFirebaseDb, admin } from '@/lib/firebase-admin';
import { shuffleArray } from '@/lib/utils';

// Generate a stable ID from question text (fallback when questionId is missing)
const makeQuestionId = (text: string): string =>
    text.replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 100);

const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
  paper: z.string().optional().describe('Specific paper for IP exam (e.g., Paper-I, Paper-III).'),
});
export type GenerateMockTestInput = z.infer<typeof GenerateMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution.'),
});

const GenerateMockTestOutputSchema = z.object({
  quizId: z.string().describe('The ID of the generated quiz document in Firestore.'),
});
export type GenerateMockTestOutput = z.infer<typeof GenerateMockTestOutputSchema>;

// Batch translation logic to stay within rate limits and optimize performance
const translateMCQBatch = async (mcqs: MCQ[], targetLanguage: string): Promise<MCQ[]> => {
    if (!mcqs.length) return [];
    
    const prompt = `Translate the following list of MCQ objects to ${targetLanguage}.
      
      **CRITICAL RULE:** Keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc. Translate only the descriptive text around them.
      
      **SOURCE MCQs JSON:**
      ${JSON.stringify(mcqs)}
      `;

    try {
        const result = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: prompt,
            output: {
                format: 'json',
                schema: z.object({ translatedMcqs: z.array(MCQSchema) }) as any,
            },
            config: { temperature: 0.1 }
        });
        
        const output = result.output;
        return (output?.translatedMcqs || mcqs).map((m: any) => ({ ...m, solution: m.solution || "" }));
    } catch (error) {
        console.error("Batch translation failed, returning originals:", error);
        return mcqs.map(m => ({ ...m, solution: m.solution || "" }));
    }
}


export async function generateMockTest(input: GenerateMockTestInput) {
  try {
    return await generateMockTestFlow(input);
  } catch (error: any) {
    console.error("Mock Test Generation Error:", error);
    return { quizId: null, error: error.message || "An unexpected error occurred on the server." };
  }
}

const generateMockTestFlow = ai.defineFlow(
  {
    name: 'generateMockTestFlow',
    inputSchema: GenerateMockTestInputSchema,
    outputSchema: GenerateMockTestOutputSchema,
  },
  async input => {
    const syllabi = await getSyllabiAdmin();
    const dynamicBlueprint = syllabi.find(s => s.id === input.examCategory);

    let blueprint;
    if (dynamicBlueprint) {
        blueprint = dynamicBlueprint;
    } else if (input.examCategory === 'MTS') {
        blueprint = MTS_BLUEPRINT;
    } else if (input.examCategory === 'POSTMAN') {
        blueprint = POSTMAN_BLUEPRINT;
    } else if (input.examCategory === 'PA') {
        blueprint = PA_BLUEPRINT;
    } else if (input.examCategory === 'IP') {
        blueprint = IP_BLUEPRINT;
    } else if (input.examCategory === 'GROUP B') {
        blueprint = GROUPB_BLUEPRINT;
    } else {
        throw new Error(`No blueprint found for exam category: ${input.examCategory}`);
    }

    let allQuestions: (MCQ & { sourceDocId?: string; topicId?: string })[] = [];
    const allFirestoreTopics = await getTopicsAdmin();
    const topicMapByName: Map<string, Topic> = new Map(allFirestoreTopics.map(t => [t.title.toLowerCase(), t]));
    
    const targetLang = input.language?.toLowerCase();
    const languageMap: Record<string, string> = { 'english': 'en', 'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te', 'kannada': 'kn' };
    const targetLangKey = targetLang ? languageMap[targetLang] : 'en';

    const allMcqDocsForCategory = await getTopicMCQsAdmin();
    const allMcqsForCategory: (MCQ & { sourceDocId: string; topicId: string })[] = [];
    
    const categoryTopicIds = new Set(allFirestoreTopics.filter(t => t.examCategories.includes(input.examCategory as any)).map(t => t.id));
    // Also include blueprint topic IDs (e.g., MTS-PB-S1-T1) and topic names for syllabusMCQs
    const categoryTopicNames = new Set(allFirestoreTopics.filter(t => t.examCategories.includes(input.examCategory as any)).map(t => t.title.toLowerCase()));
    const blueprintTopicIds = new Set<string>();
    for (const part of blueprint.parts) {
        for (const section of part.sections) {
            if (section.topics) {
                (section.topics as any[]).forEach((t: any) => {
                    if (t && t.id) blueprintTopicIds.add(t.id);
                    if (t && t.name) categoryTopicNames.add(t.name.toLowerCase());
                });
            }
        }
    }

    allMcqDocsForCategory.forEach(doc => {
      const matchById = categoryTopicIds.has(doc.topicId) || blueprintTopicIds.has(doc.topicId);
      const matchByName = doc.topicName && categoryTopicNames.has(doc.topicName.toLowerCase());
      if (matchById || matchByName) {
        try {
          const parsed = JSON.parse(doc.content);
          // Support: plain array, {mcqs:[]}, {questions:[]}
          let mcqList: any[] = [];
          if (Array.isArray(parsed)) {
            mcqList = parsed;
          } else if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
            mcqList = parsed.mcqs;
          } else if (parsed.questions && Array.isArray(parsed.questions)) {
            mcqList = parsed.questions;
          }
          mcqList.forEach((mcq: any) => {
            allMcqsForCategory.push({ ...mcq, sourceDocId: doc.id, topicId: doc.topicId });
          });
        } catch (e) { }
      }
    });

    for (const part of blueprint.parts) {
      if (input.examCategory === 'IP' && input.paper && part.partName !== input.paper) {
        continue;
      }
      for (const section of part.sections) {
        if ((part as any).nonVerbalTopics) {
            const allReasoningQuestions = await getReasoningQuestionsAdmin();
            const totalQuestionsNeeded = (part as any).nonVerbalTopics.reduce((sum: number, t: any) => sum + t.questions, 0);
            if (allReasoningQuestions.length >= totalQuestionsNeeded) {
                const shuffledReasoning = shuffleArray(allReasoningQuestions).slice(0, totalQuestionsNeeded);
                const formatted: any[] = shuffledReasoning.map(q => ({
                    questionId: q.id,
                    topicId: 'reasoningBank',
                    question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : ""),
                    topic: q.topic || "Reasoning",
                }));
                allQuestions.push(...formatted);
            }
            continue;
        }

        const topicRequests = new Map<string, number>();
        let randomFromRequest: { topics: string[], questions: number } | null = null;
        
        if ((section as any).topics) {
            (section as any).topics.forEach((topicDef: any) => {
                const topicInfo = topicMapByName.get(topicDef.name.toLowerCase());
                if (topicInfo) topicRequests.set(topicInfo.id, topicDef.questions);
            });
        }
        
        if ((section as any).randomFrom) {
            const topicIds = (section as any).randomFrom.topics
                .map((name: string) => topicMapByName.get(name.toLowerCase())?.id)
                .filter(Boolean) as string[];
            randomFromRequest = { topics: topicIds, questions: (section as any).randomFrom.questions };
        }
        
        const filteredForSection = allMcqsForCategory.filter(m => {
            if (topicRequests.has(m.topicId)) return true;
            if (randomFromRequest?.topics.includes(m.topicId)) return true;
            return false;
        });
        
        allQuestions.push(...shuffleArray(filteredForSection).slice(0, (section as any).topics ? (section as any).topics.length : (randomFromRequest?.questions || 0)));
      }
    }
    
    // Translation process - optimized with batching
    const finalProcessedQuestions: MCQ[] = new Array(allQuestions.length);
    const needTranslation: { mcq: MCQ; index: number }[] = [];

    allQuestions.forEach((q, idx) => {
        if (targetLang === 'english' || !targetLangKey) {
            finalProcessedQuestions[idx] = { ...q, topic: q.topic || "", solution: q.solution || "" };
        } else if ((q as any).translations && (q as any).translations[targetLangKey]) {
            const translated = (q as any).translations[targetLangKey];
            finalProcessedQuestions[idx] = { ...q, ...translated, topic: q.topic || "", solution: translated.solution || q.solution || "" };
        } else {
            needTranslation.push({ mcq: q, index: idx });
        }
    });

    if (needTranslation.length > 0 && input.language && targetLang !== 'english') {
        const CHUNK_SIZE = 15;
        for (let i = 0; i < needTranslation.length; i += CHUNK_SIZE) {
            const chunk = needTranslation.slice(i, i + CHUNK_SIZE);
            const translatedChunk = await translateMCQBatch(chunk.map(c => c.mcq), input.language);
            
            translatedChunk.forEach((translated, chunkIdx) => {
                if (chunkIdx < chunk.length) {
                    const original = chunk[chunkIdx];
                    finalProcessedQuestions[original.index] = {
                        ...original.mcq,
                        ...translated,
                        topic: translated.topic || original.mcq.topic || "",
                        solution: translated.solution || original.mcq.solution || ""
                    };
                }
            });
        }
    }

    // Final pass to fill any holes (fallback to English) and sanitize
    allQuestions.forEach((q, idx) => {
        if (!finalProcessedQuestions[idx]) {
            finalProcessedQuestions[idx] = { ...q, topic: q.topic || "", solution: q.solution || "" };
        }
    });

    const quizData = {
        mcqs: shuffleArray(finalProcessedQuestions.filter(Boolean)).map(m => ({
            questionId: m.questionId || makeQuestionId(m.question),
            topicId: (m as any).topicId,
            question: m.question,
            options: shuffleArray([...m.options]),
            correctAnswer: m.correctAnswer,
            topic: m.topic || "",
            solution: m.solution || ""
        })),
        timeLimit: (blueprint?.totalDurationMinutes || 60) * 60,
        isMockTest: true,
        language: input.language,
        examCategory: input.examCategory,
        topic: {
            id: `mock-test-${input.examCategory}-${input.paper || 'full'}-${Date.now()}`,
            title: `${blueprint?.examName || input.examCategory} ${input.paper || ''} Mock Test`.trim(),
            description: `A full-length mock test based on the official ${input.examCategory} ${input.paper || ''} syllabus.`.trim(),
            icon: 'scroll-text',
            categoryId: 'mock-test',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const db = getFirebaseDb();
    const docRef = await db.collection("generatedQuizzes").add(quizData);

    return { quizId: docRef.id };
  }
);