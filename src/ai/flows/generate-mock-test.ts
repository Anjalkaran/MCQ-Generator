
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
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
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

    const languageMap: Record<string, string> = {
        'english': 'en',
        'tamil': 'ta',
        'hindi': 'hi',
        'telugu': 'te',
        'kannada': 'kn'
    };
    
    const targetLangKey = targetLang ? languageMap[targetLang] : 'en';


    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        let sectionQuestions: MCQ[] = [];

        // Special handling for General Awareness - always generate with AI
        if (section.sectionName.toLowerCase().includes("general awareness")) {
            const topicsAndCounts = section.topics.map(t => (typeof t === 'string' ? { name: t, questions: 0 } : t)).filter(t => t.questions > 0);
            
            if(topicsAndCounts.length > 0) {
                const { output } = await generateGkQuestionsPrompt({
                    examCategory: input.examCategory,
                    topicsAndCounts: topicsAndCounts,
                    language: input.language,
                });

                if (output && output.questions) {
                    sectionQuestions.push(...output.questions);
                } else {
                    throw new Error(`Failed to generate General Awareness questions for section: "${section.sectionName}".`);
                }
            }
            
        } else if (section.sectionName.toLowerCase().includes("reasoning")) {
            const allReasoningBankQuestions = await getReasoningQuestionsForPartwiseTest(input.examCategory as 'MTS' | 'POSTMAN' | 'PA');

            for (const topicDef of section.topics) {
                const { name: topicName, questions: questionsNeeded } = typeof topicDef === 'string' ? { name: topicDef, questions: 0 } : topicDef;
                
                if (questionsNeeded === 0) continue;

                if (topicName.toLowerCase() === 'analytical reasoning') {
                    // Fetch text-based analytical reasoning from the main MCQ bank
                    const topicInfo = topicMapByName.get(topicName.toLowerCase());
                    if (!topicInfo) {
                        throw new Error(`Topic "${topicName}" not found in Firestore for section "${section.sectionName}".`);
                    }
                    
                    const mcqDocs = await getTopicMCQs(topicInfo.id);
                    const canonicalQuestions: (MCQ & { sourceDocId: string, translations?: Record<string, any> })[] = [];
                    mcqDocs.forEach(doc => {
                        try {
                            const parsed = JSON.parse(doc.content);
                            if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
                                parsed.mcqs.forEach((mcq: any) => {
                                    canonicalQuestions.push({ ...mcq, sourceDocId: doc.id });
                                });
                            }
                        } catch (e) { /* ignore non-json */ }
                    });

                    if (canonicalQuestions.length < questionsNeeded) {
                        throw new Error(`Not enough questions for "${topicName}". Found ${canonicalQuestions.length}, but need ${questionsNeeded}.`);
                    }
                    
                    const processedQuestions = await Promise.all(
                        shuffleArray(canonicalQuestions).slice(0, questionsNeeded).map(async (cq) => {
                            if (targetLang === 'english' || !targetLangKey) return cq;
                            
                            if (cq.translations && cq.translations[targetLangKey]) {
                                const translated = cq.translations[targetLangKey];
                                return {
                                    ...cq,
                                    ...translated,
                                };
                            }
                            
                            if (input.language) {
                                const translatedMcq = await translateMCQ(cq, input.language);
                                updateTopicMCQWithTranslation(cq.sourceDocId, cq.question, targetLangKey, translatedMcq).catch(err => console.error("Failed to save translation:", err));
                                return translatedMcq;
                            }
                            return cq;
                        })
                    );
                    sectionQuestions.push(...processedQuestions);
                } else {
                    // Fetch image-based reasoning from the reasoning bank
                    const topicQuestions = allReasoningBankQuestions.filter(q => q.topic.toLowerCase() === topicName.toLowerCase());
                    if (topicQuestions.length < questionsNeeded) {
                        throw new Error(`Not enough questions in Reasoning Bank for "${topicName}". Found ${topicQuestions.length}, but need ${questionsNeeded}.`);
                    }
                    const selectedReasoning = shuffleArray(topicQuestions).slice(0, questionsNeeded);
                    const formattedReasoningMCQs: MCQ[] = selectedReasoning.map((q: ReasoningQuestion) => ({
                        question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                        topic: q.topic,
                    }));
                    sectionQuestions.push(...formattedReasoningMCQs);
                }
            }
        } else { // Handle all other non-reasoning sections
            const topicNamesInSection = section.topics.map(t => (typeof t === 'string' ? t : t.name));
            const topicMapping: { name: string, id: string, docId?: string }[] = [];
            
            for (const topicName of topicNamesInSection) {
                const topicInfo = topicMapByName.get(topicName.toLowerCase());
                if (topicInfo) {
                    topicMapping.push({ name: topicInfo.title, id: topicInfo.id });
                } else {
                    console.warn(`Blueprint topic "${topicName}" not found in Firestore. Skipping.`);
                }
            }

            if (topicMapping.length === 0) {
                throw new Error(`No topics found in Firestore for section: "${section.sectionName}". Please check blueprint and topic names.`);
            }

            const allMcqDocsForSection = await Promise.all(topicMapping.map(t => getTopicMCQs(t.id)));
            const canonicalQuestions: (MCQ & { sourceDocId: string, translations?: Record<string, any> })[] = [];

            allMcqDocsForSection.flat().forEach(doc => {
                try {
                    const parsed = JSON.parse(doc.content);
                    if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
                        parsed.mcqs.forEach((mcq: any) => {
                            canonicalQuestions.push({ ...mcq, sourceDocId: doc.id });
                        });
                    }
                } catch (e) {
                    // Ignore content that is not valid JSON
                }
            });
            
            if (canonicalQuestions.length === 0) {
                 throw new Error(`No valid JSON MCQ documents have been uploaded for the topics in section: "${section.sectionName}".`);
            }
            
            const processedQuestions: MCQ[] = [];
            const sectionQuestionsNeeded = section.questions;

            for (const cq of shuffleArray(canonicalQuestions)) {
                if (processedQuestions.length >= sectionQuestionsNeeded) break;

                if (targetLang === 'english' || !targetLangKey) {
                    processedQuestions.push(cq);
                } else if (cq.translations && cq.translations[targetLangKey]) {
                     const translated = cq.translations[targetLangKey];
                     processedQuestions.push({ ...cq, ...translated });
                } else {
                    if (input.language) {
                        try {
                            console.log(`Translating question for topic ${cq.topic} to ${input.language}...`);
                            const translatedMcq = await translateMCQ(cq, input.language);
                            processedQuestions.push(translatedMcq);
                            
                            updateTopicMCQWithTranslation(cq.sourceDocId, cq.question, targetLangKey, translatedMcq)
                                .catch(err => console.error("Failed to save translation:", err));
                        } catch (e) {
                            console.error(`Skipping question due to translation error for topic ${cq.topic}:`, e);
                        }
                    } else {
                        processedQuestions.push(cq);
                    }
                }
            }


            if (processedQuestions.length < sectionQuestionsNeeded) {
                throw new Error(`Could not find enough questions for section "${section.sectionName}". Found ${processedQuestions.length}, but need ${sectionQuestionsNeeded}. Please upload more questions.`);
            }

            sectionQuestions.push(...shuffleArray(processedQuestions).slice(0, sectionQuestionsNeeded));
        }
        
        allQuestions.push(...sectionQuestions);
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    
    return { mcqs: shuffleArray(allQuestions).slice(0, totalExpectedQuestions) };
  }
);

    