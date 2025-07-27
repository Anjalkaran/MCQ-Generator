
'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ } from '@/lib/types';
import { getAllUserQuestions } from '@/lib/firestore';

const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated test (e.g., "English", "Tamil", "Hindi").'),
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

const generateQuestionsForSectionPrompt = ai.definePrompt({
    name: 'generateQuestionsForSectionPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            sectionName: z.string(),
            topics: z.string(),
            questionCount: z.number(),
            previousQuestions: z.array(z.string()).optional().describe('A list of previously asked questions to avoid repetition.'),
            language: z.string().optional().default('English'),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert in creating mock test questions for the Indian Postal Department's {{examCategory}} exam.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

Your task is to generate EXACTLY **{{questionCount}}** questions for the section named **"{{sectionName}}"**.

These questions must cover the following topics:
{{{topics}}}

For each generated question, you MUST specify its topic in the 'topic' field from the list above.
For any arithmetic questions, provide a detailed step-by-step explanation in the 'solution' field.

{{#if previousQuestions}}
  IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
  {{#each previousQuestions}}
  - "{{this}}"
  {{/each}}
{{/if}}

Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
`,
});


export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const CHUNK_SIZE = 10;

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
    
    const previousQuestions = await getAllUserQuestions(input.userId);
    const allQuestions: MCQ[] = [];

    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        const topicsString = section.topics.map((topic: any) => {
          const topicName = (typeof topic === 'string') ? topic : topic.name;
          return `- ${topicName}`;
        }).join('\n');
        
        let questionsToGenerate = section.questions;
        
        // Process requests sequentially for each section to avoid overwhelming the API
        while(questionsToGenerate > 0) {
            const currentChunkSize = Math.min(questionsToGenerate, CHUNK_SIZE);
            
            const { output } = await generateQuestionsForSectionPrompt({
                examCategory: input.examCategory,
                sectionName: section.sectionName,
                topics: topicsString,
                questionCount: currentChunkSize,
                previousQuestions: [...previousQuestions, ...allQuestions.map(q => q.question)], // Include already generated questions
                language: input.language,
            });

            if (output && output.questions) {
                allQuestions.push(...output.questions);
            }
            questionsToGenerate -= currentChunkSize;
        }
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allQuestions.length !== totalExpectedQuestions) { 
        console.warn(`Generated question count mismatch. Expected ${totalExpectedQuestions}, but got ${allQuestions.length}.`);
    }
    
    return { mcqs: allQuestions };
  }
);
