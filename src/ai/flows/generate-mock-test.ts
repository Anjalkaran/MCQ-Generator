
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
import { getTopicMCQs, getReasoningQuestionsForPartwiseTest, getTopics, updateTopicMCQWithTranslation } from '@/lib/firestore';
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
    
    // --- Optimized Data Fetching ---
    const allTopicNames = new Set<string>();
    blueprint.parts.forEach(part => {
        part.sections.forEach(section => {
             // Skip GK section from this pre-fetch
            if (section.sectionName.toLowerCase().includes("general awareness")) {
                return;
            }
            if (section.topics) {
                section.topics.forEach(topicDef => {
                    const name = typeof topicDef === 'string' ? topicDef : topicDef.name;
                    allTopicNames.add(name.toLowerCase());
                });
            }
            if (section.randomFrom) {
                section.randomFrom.topics.forEach(name => allTopicNames.add(name.toLowerCase()));
            }
        });
    });
    
    const allTopicIds = Array.from(allTopicNames).map(name => topicMapByName.get(name)?.id).filter(Boolean) as string[];
    
    const allMcqDocsPromises = allTopicIds.map(id => getTopicMCQs(id));
    const allMcqDocsNested = await Promise.all(allMcqDocsPromises);
    const allMcqDocs = allMcqDocsNested.flat();

    const mcqsByTopicId = new Map<string, (MCQ & { sourceDocId: string, translations?: Record<string, any> })[]>();
    allMcqDocs.forEach(doc => {
        try {
            const parsed = JSON.parse(doc.content);
            if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
                const existing = mcqsByTopicId.get(doc.topicId) || [];
                const newMcqs = parsed.mcqs.map((mcq: any) => ({ ...mcq, sourceDocId: doc.id }));
                mcqsByTopicId.set(doc.topicId, [...existing, ...newMcqs]);
            }
        } catch (e) { /* ignore parse errors */ }
    });
    // --- End Optimized Data Fetching ---

    const targetLang = input.language?.toLowerCase();
    const languageMap: Record<string, string> = { 'english': 'en', 'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te', 'kannada': 'kn' };
    const targetLangKey = targetLang ? languageMap[targetLang] : 'en';

    // Helper function to process and translate questions
    const processAndTranslate = async (canonicalQuestions: (MCQ & { sourceDocId: string, translations?: Record<string, any> })[]): Promise<MCQ[]> => {
        const processed: MCQ[] = [];
        for (const cq of canonicalQuestions) {
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
        return processed;
    };


    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        let sectionQuestions: MCQ[] = [];
        
        // --- Special Case: Generate General Knowledge Questions with AI ---
        if (section.sectionName.toLowerCase().includes("general awareness")) {
            const gkTopicsAndCounts = (section.topics || []).map(topicDef => ({
                name: typeof topicDef === 'string' ? topicDef : topicDef.name,
                questions: typeof topicDef === 'string' ? 1 : topicDef.questions,
            }));
            
            if (section.randomFrom) {
                // For MTS blueprint
                 const totalQuestionsNeeded = section.randomFrom.questions;
                 const topicsPerQuestion = Math.ceil(totalQuestionsNeeded / section.randomFrom.topics.length);
                 section.randomFrom.topics.forEach(topicName => {
                     gkTopicsAndCounts.push({ name: topicName, questions: topicsPerQuestion });
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
                sectionQuestions.push(...output.questions);
            }

        } else if (section.randomFrom) {
            const topicNames = section.randomFrom.topics;
            const relevantTopicIds = topicNames.map(name => topicMapByName.get(name.toLowerCase())?.id).filter(Boolean) as string[];
            
            if (relevantTopicIds.length === 0) {
                throw new Error(`No valid topics found in Firestore for random selection section: "${section.sectionName}".`);
            }
            
            const canonicalQuestions: (MCQ & { sourceDocId: string, translations?: Record<string, any> })[] = [];
            relevantTopicIds.forEach(id => {
                const questions = mcqsByTopicId.get(id) || [];
                canonicalQuestions.push(...questions);
            });

            if (canonicalQuestions.length < section.questions) {
                 throw new Error(`Could not find enough questions for random selection in section "${section.sectionName}". Found ${canonicalQuestions.length}, but need ${section.questions}.`);
            }

            const processed = await processAndTranslate(canonicalQuestions);
            sectionQuestions.push(...shuffleArray(processed).slice(0, section.questions));

        }
        else {
            for (const topicDef of section.topics) {
                const { name: topicName, questions: questionsNeededForTopic } = typeof topicDef === 'string' ? { name: topicDef, questions: 1 } : topicDef;

                if (questionsNeededForTopic === 0) continue;

                const topicInfo = topicMapByName.get(topicName.toLowerCase());
                if (!topicInfo) {
                    console.warn(`Blueprint topic "${topicName}" not found in Firestore for this exam category. Skipping.`);
                    continue;
                }
                
                const canonicalQuestions = mcqsByTopicId.get(topicInfo.id) || [];
                
                if (canonicalQuestions.length < questionsNeededForTopic) {
                     throw new Error(`Not enough questions for "${topicName}". Found ${canonicalQuestions.length}, but need ${questionsNeededForTopic}.`);
                }

                const processed = await processAndTranslate(shuffleArray(canonicalQuestions));
                sectionQuestions.push(...processed.slice(0, questionsNeededForTopic));
            }
        }
        
        allQuestions.push(...sectionQuestions);
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.sections.reduce((s, sec) => s + sec.questions, 0), 0);
    const finalMCQs = shuffleArray(allQuestions)
      .slice(0, totalExpectedQuestions)
      .map(mcq => ({ ...mcq, solution: mcq.solution || "" })); // Ensure solution is not undefined

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
