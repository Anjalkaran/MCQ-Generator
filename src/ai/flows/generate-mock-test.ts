
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

const MATERIAL_CHUNK_SIZE = 8000;

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextPrompt',
    input: { schema: z.object({ textContent: z.string(), topicNames: z.array(z.string()) }) },
    output: { schema: GenerateMockTestOutputSchema },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs). Your task is to extract ALL high-quality, unique questions you can find for the topics listed below from the 'TEXT CONTENT' provided.
Topics to Extract:
{{#each topicNames}}
- {{this}}
{{/each}}
CRITICAL INSTRUCTIONS:
*   The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   TRIMMING RULE: If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix.
--- TEXT CONTENT ---
{{{textContent}}}
--- END TEXT CONTENT ---`,
});

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
    const targetLang = input.language;

    for (const part of blueprint.parts) {
      for (const section of part.sections) {

        let sectionQuestionsNeeded = section.questions;
        let sectionQuestions: MCQ[] = [];

        if (section.sectionName.toLowerCase().includes("reasoning")) {
            const reasoningBankQuestions = await getReasoningQuestionsForPartwiseTest(input.examCategory as 'MTS' | 'POSTMAN' | 'PA');
            if (reasoningBankQuestions.length < sectionQuestionsNeeded) {
                throw new Error(`Not enough questions in the Reasoning Bank for ${section.sectionName}. Found ${reasoningBankQuestions.length}, but need ${sectionQuestionsNeeded}. Please upload more.`);
            }
            const selectedReasoning = shuffleArray(reasoningBankQuestions).slice(0, sectionQuestionsNeeded);
            const formattedReasoningMCQs: MCQ[] = selectedReasoning.map((q: ReasoningQuestion) => ({
                question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                options: q.options,
                correctAnswer: q.correctAnswer,
                solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                topic: q.topic,
            }));
            sectionQuestions.push(...formattedReasoningMCQs);
        } else {
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
            const canonicalQuestions: (MCQ & { sourceDocId: string, translations?: Record<string, MCQ> })[] = [];

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

            for (const cq of shuffleArray(canonicalQuestions)) {
                if (processedQuestions.length >= sectionQuestionsNeeded) break;

                if (targetLang === 'English') {
                    processedQuestions.push(cq);
                } else if (cq.translations && cq.translations[targetLang]) {
                    processedQuestions.push(cq.translations[targetLang]);
                } else {
                    try {
                        console.log(`Translating question for topic ${cq.topic} to ${targetLang}...`);
                        const translatedMcq = await translateMCQ(cq, targetLang);
                        processedQuestions.push(translatedMcq);
                        
                        updateTopicMCQWithTranslation(cq.sourceDocId, cq.question, targetLang, translatedMcq)
                            .catch(err => console.error("Failed to save translation:", err));
                    } catch (e) {
                        console.error(`Skipping question due to translation error for topic ${cq.topic}:`, e);
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
