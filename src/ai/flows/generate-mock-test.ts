
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
import { getShuffledMCQsForTopics, getTopics, updateTopicMCQWithTranslation, getReasoningQuestionsForPartwiseTest } from '@/lib/firestore';
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

const generateGkQuestionsPrompt = ai.definePrompt({
    name: 'generateGkQuestionsPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            topicsAndCounts: z.array(z.object({ name: z.string(), questions: z.number() })),
            language: z.string().optional().default('English'),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert in creating high-quality General Knowledge and Awareness practice questions for the Indian Postal Department's {{examCategory}} exam.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**

Your task is to generate a set of multiple-choice questions based on the provided list of topics and the number of questions required for each.

**Topics and Question Counts:**
{{#each topicsAndCounts}}
-   **Topic:** {{name}}
-   **Number of Questions:** {{questions}}
{{/each}}

**CRITICAL INSTRUCTIONS:**
*   For each generated question, you MUST specify its source topic in the 'topic' field.
*   The 'correctAnswer' must be an EXACT match to one of the four options.
*   The 'solution' field should be an empty string ("").

Your final output MUST be a single, valid JSON object containing a 'questions' array with the total number of questions requested.
`,
});


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

    const allQuestions: MCQ[] = [];
    const allFirestoreTopics = await getTopics();
    const topicMapByName: Map<string, Topic> = new Map(allFirestoreTopics.map(t => [t.title.toLowerCase(), t]));
    
    const targetLang = input.language?.toLowerCase();
    const languageMap: Record<string, string> = { 'english': 'en', 'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te', 'kannada': 'kn' };
    const targetLangKey = targetLang ? languageMap[targetLang] : 'en';

    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        
        // --- Special Case: Generate General Knowledge Questions with AI ---
        if (section.sectionName.toLowerCase().includes("general awareness")) {
            const gkTopicsAndCounts: { name: string, questions: number }[] = [];
            
            if (section.topics) {
                gkTopicsAndCounts.push(...section.topics.map(topicDef => ({
                    name: topicDef.name,
                    questions: topicDef.questions,
                })));
            }
            if (section.randomFrom) {
                 const totalQuestionsNeeded = section.randomFrom.questions;
                 // Distribute questions as evenly as possible among topics
                 const topicsCount = section.randomFrom.topics.length;
                 const baseQuestions = Math.floor(totalQuestionsNeeded / topicsCount);
                 let remainder = totalQuestionsNeeded % topicsCount;
                 
                 section.randomFrom.topics.forEach(topicName => {
                     let questionsForThisTopic = baseQuestions;
                     if (remainder > 0) {
                         questionsForThisTopic++;
                         remainder--;
                     }
                     if (questionsForThisTopic > 0) {
                        gkTopicsAndCounts.push({ name: topicName, questions: questionsForThisTopic });
                     }
                 });
            }

            if (gkTopicsAndCounts.length > 0) {
                 const { output } = await generateGkQuestionsPrompt({
                    examCategory: input.examCategory,
                    topicsAndCounts: gkTopicsAndCounts,
                    language: input.language
                });
                
                if (!output || !output.questions) {
                    throw new Error(`AI failed to generate General Awareness questions for section: "${section.sectionName}".`);
                }
                allQuestions.push(...output.questions);
            }
            continue; // Move to the next section
        }

        // --- Special Case: Fetch Reasoning Questions ---
        if (section.sectionName.toLowerCase().includes("reasoning")) {
            const reasoningQuestionsNeeded = section.questions;
            const reasoningQuestions = await getReasoningQuestionsForPartwiseTest(input.examCategory as 'MTS' | 'POSTMAN' | 'PA');

            if (reasoningQuestions.length < reasoningQuestionsNeeded) {
                throw new Error(`Could not find enough reasoning questions. Found ${reasoningQuestions.length}, but need ${reasoningQuestionsNeeded}. Please upload more.`);
            }

            const selectedReasoning = shuffleArray(reasoningQuestions).slice(0, reasoningQuestionsNeeded);

            const formattedReasoningMCQs: MCQ[] = selectedReasoning.map(q => ({
                question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                options: q.options.map(opt => typeof opt === 'string' && opt.startsWith('data:image') ? `<img src="${opt}" alt="Option Image" class="h-24 w-24 object-contain" />` : opt),
                correctAnswer: typeof q.correctAnswer === 'string' && q.correctAnswer.startsWith('data:image') ? `<img src="${q.correctAnswer}" alt="Option Image" class="h-24 w-24 object-contain" />` : q.correctAnswer,
                solution: q.solutionText ? `${q.solutionText}${q.solutionImage ? `<br/><img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : ''}` : (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                topic: 'Reasoning',
            }));
            
            allQuestions.push(...formattedReasoningMCQs);
            continue; // Move to the next section
        }

        // --- Standard Question Fetching from MCQ Bank ---
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
        
        const fetchedMCQs = await getShuffledMCQsForTopics(topicRequests, randomFromRequest);
        
        const processed: MCQ[] = [];
        for (const cq of fetchedMCQs) {
            let finalMcq: MCQ;
            if (targetLang === 'english' || !targetLangKey) {
                finalMcq = cq;
            } else if (cq.translations && cq.translations[targetLangKey]) {
                const translated = cq.translations[targetLangKey];
                finalMcq = { ...cq, ...translated };
            } else if (input.language) {
                try {
                    const translatedMcq = await translateMCQ(cq, input.language);
                    updateTopicMCQWithTranslation(cq.sourceDocId, cq.question, targetLangKey, translatedMcq).catch(err => console.error("Failed to save translation:", err));
                    finalMcq = translatedMcq;
                } catch (e) {
                    console.error(`Skipping question due to translation error for topic ${cq.topic}:`, e);
                    continue; // Skip this question if translation fails
                }
            } else {
                finalMcq = cq;
            }
            const { translations, sourceLanguage, ...rest } = finalMcq as any;
            processed.push(rest);
        }
        allQuestions.push(...processed);
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.sections.reduce((s, sec) => s + (sec.questions || sec.randomFrom?.questions || 0), 0), 0);
    const finalMCQs = shuffleArray(allQuestions).map(mcq => ({ ...mcq, solution: mcq.solution || "" })); // Ensure solution is not undefined

    if (finalMCQs.length < totalExpectedQuestions) {
        throw new Error(`Failed to generate the full mock test. Could only gather ${finalMCQs.length} out of ${totalExpectedQuestions} required questions. Please check the MCQ bank.`);
    }

    const quizData = {
        mcqs: finalMCQs,
        timeLimit: blueprint.totalDurationMinutes * 60,
        isMockTest: true,
        topic: {
            id: `mock-test-${input.examCategory}-${Date.now()}`,
            title: `${blueprint.examName} Mock Test`,
            description: `A full-length mock test based on the official ${input.examCategory} syllabus.`,
            icon: 'scroll-text',
            categoryId: 'mock-test',
            part: 'Part A', // Default value
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
