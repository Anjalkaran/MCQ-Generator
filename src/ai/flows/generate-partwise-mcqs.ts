
'use server';

/**
 * @fileOverview Generates a practice test for an entire part of an exam syllabus by pulling questions from the MCQ Bank.
 *
 * - generatePartwiseMCQs - A function that handles the quiz generation process.
 * - GeneratePartwiseMCQsInput - The input type for the generatePartwiseMCQs function.
 * - GeneratePartwiseMCQsOutput - The return type for the generatePartwiseMCQs function.
 */

import { z } from 'zod';
import { getTopicsByPartAndExam, getTopicMCQs, updateTopicMCQWithTranslation } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';
import { generate } from '@genkit-ai/ai';
import { gemini15Pro } from '@genkit-ai/googleai';
import { zodToJsonSchema } from 'zod-to-json-schema';

const GeneratePartwiseMCQsInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.enum(['Part A', 'Part B']).describe('The syllabus part (Part A or Part B).'),
  numberOfQuestions: z.number().describe('The total number of questions to generate for the part.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
});
export type GeneratePartwiseMCQsInput = z.infer<typeof GeneratePartwiseMCQsInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
});

const GeneratePartwiseMCQsOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated practice quiz questions.'),
});
export type GeneratePartwiseMCQsOutput = z.infer<typeof GeneratePartwiseMCQsOutputSchema>;

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


export async function generatePartwiseMCQs(input: GeneratePartwiseMCQsInput): Promise<GeneratePartwiseMCQsOutput> {
  const { examCategory, part, numberOfQuestions, userId, language } = input;

  let finalMCQs: MCQ[] = [];
  const targetLang = language?.toLowerCase();
  
  const languageMap: Record<string, string> = {
      'english': 'en',
      'tamil': 'ta',
      'hindi': 'hi',
      'telugu': 'te',
      'kannada': 'kn'
  };
  const targetLangKey = targetLang ? languageMap[targetLang] : 'en';
  
  // Fetch questions from the MCQ bank for the relevant topics in the selected part.
  const topicsForPart = await getTopicsByPartAndExam(part, examCategory);
  if (topicsForPart.length === 0) {
      throw new Error(`No topics found for ${examCategory} - ${part}. Please check if topics have been assigned to this part.`);
  }

  const allMcqDocsForPart = await Promise.all(topicsForPart.map(t => getTopicMCQs(t.id)));
  const canonicalQuestions: (MCQ & { sourceDocId: string, translations?: Record<string, any> })[] = [];

  allMcqDocsForPart.flat().forEach(doc => {
      try {
          const parsed = JSON.parse(doc.content);
          if (parsed.mcqs && Array.isArray(parsed.mcqs)) {
              parsed.mcqs.forEach((mcq: any) => {
                  canonicalQuestions.push({ ...mcq, sourceDocId: doc.id });
              });
          }
      } catch (e) { /* Ignore non-json files */ }
  });

  if (canonicalQuestions.length < numberOfQuestions) {
    throw new Error(`Not enough questions in the MCQ Bank for ${part}. Found ${canonicalQuestions.length}, but you requested ${numberOfQuestions}. Please upload more JSON question files for topics in this part.`);
  }
  
  const processedQuestions: MCQ[] = [];
  
  // Process translations and collect questions
   for (const cq of shuffleArray(canonicalQuestions)) {
      if (processedQuestions.length >= numberOfQuestions) break;

      if (targetLang === 'english' || !targetLangKey) {
          processedQuestions.push(cq);
      } else if (cq.translations && cq.translations[targetLangKey]) {
            const translated = cq.translations[targetLangKey];
            processedQuestions.push({ ...cq, ...translated });
      } else {
          if (input.language) {
              try {
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
  
  if (processedQuestions.length < numberOfQuestions) {
      throw new Error(`Could not find or translate enough questions for ${part}. Processed ${processedQuestions.length}, but need ${numberOfQuestions}.`);
  }

  finalMCQs = shuffleArray(processedQuestions).slice(0, numberOfQuestions);

  if (finalMCQs.length === 0) {
      throw new Error('Could not find any questions for the selected part. Please check the MCQ bank or contact support.');
  }
  
  return { mcqs: finalMCQs };
}
