
'use server';

/**
 * @fileOverview Generates a mock test by extracting questions from a provided question bank.
 *
 * - generateMockTestFromBank - A function that handles the mock test generation process.
 * - GenerateMockTestFromBankInput - The input type for the function.
 * - GenerateMockTestFromBankOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ } from '@/lib/types';
import { getQuestionBankByCategory } from '@/lib/firestore';

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
});
export type GenerateMockTestFromBankInput = z.infer<typeof GenerateMockTestFromBankInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available in the source.'),
});

const GenerateMockTestFromBankOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;

const generateQuestionsFromBankPrompt = ai.definePrompt({
    name: 'generateQuestionsFromBankPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            sectionName: z.string(),
            topics: z.string(),
            questionCount: z.number(),
            questionBank: z.string(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Extractor for the Indian Postal Department's {{examCategory}} exam.

Your task is to extract EXACTLY **{{questionCount}}** questions for the section named **"{{sectionName}}"** from the provided 'QUESTION BANK'.

The questions you extract must be relevant to the following topics:
{{{topics}}}

- For each extracted question, you MUST identify its topic from the list above and specify it in the 'topic' field.
- If the question bank provides a solution or explanation, include it in the 'solution' field. Otherwise, leave it empty.
- Ensure the questions, options, and correct answers are extracted precisely as they appear in the source material.
- If the question bank doesn't have enough relevant questions for a section, do your best to find the closest matches. DO NOT invent new questions.

--- QUESTION BANK START ---
{{{questionBank}}}
--- QUESTION BANK END ---

Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
`,
});

export async function generateMockTestFromBank(input: GenerateMockTestFromBankInput): Promise<GenerateMockTestFromBankOutput> {
  return generateMockTestFromBankFlow(input);
}

const generateMockTestFromBankFlow = ai.defineFlow(
  {
    name: 'generateMockTestFromBankFlow',
    inputSchema: GenerateMockTestFromBankInputSchema,
    outputSchema: GenerateMockTestFromBankOutputSchema,
  },
  async input => {
    let blueprint;
    let bankCategory;

    if (input.examCategory === 'MTS') {
        blueprint = MTS_BLUEPRINT;
        bankCategory = 'MTS';
    } else if (input.examCategory === 'POSTMAN') {
        blueprint = POSTMAN_BLUEPRINT;
        bankCategory = 'MTS'; // Postman uses MTS question bank
    } else if (input.examCategory === 'PA') {
        blueprint = PA_BLUEPRINT;
        bankCategory = 'PA';
    } else {
        throw new Error(`No blueprint found for exam category: ${input.examCategory}`);
    }

    const questionBankContent = await getQuestionBankByCategory(bankCategory);
    if (!questionBankContent) {
        throw new Error(`No question bank found for exam category: ${bankCategory}. Please upload some documents.`);
    }
    
    const allQuestions: MCQ[] = [];
    const generationPromises: Promise<{ questions: MCQ[] }>[] = [];

    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        const topicsString = section.topics.map((topic: any) => {
          const topicName = (typeof topic === 'string') ? topic : topic.name;
          return `- ${topicName}`;
        }).join('\n');
        
        generationPromises.push(
            (async () => {
                const { output } = await generateQuestionsFromBankPrompt({
                    examCategory: input.examCategory,
                    sectionName: section.sectionName,
                    topics: topicsString,
                    questionCount: section.questions,
                    questionBank: questionBankContent,
                });
                return output || { questions: [] };
            })()
        );
      }
    }

    const results = await Promise.all(generationPromises);
    results.forEach(result => {
        if (result && result.questions) {
            allQuestions.push(...result.questions);
        }
    });
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allQuestions.length !== totalExpectedQuestions) { 
        console.warn(`Generated question count mismatch. Expected ${totalExpectedQuestions}, but got ${allQuestions.length}.`);
    }
    
    return { mcqs: allQuestions };
  }
);
