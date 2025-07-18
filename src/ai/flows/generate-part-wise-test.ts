
'use server';

/**
 * @fileOverview Generates a part-wise test based on exam category and syllabus part.
 *
 * - generatePartWiseTest - A function that handles the part-wise test generation process.
 * - GeneratePartWiseTestInput - The input type for the generatePartWiseTest function.
 * - GeneratePartWiseTestOutput - The return type for the generatePartWiseTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getTopics } from '@/lib/firestore';
import type { Topic } from '@/lib/types';

const GeneratePartWiseTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.string().describe('The part of the syllabus (e.g., Part A, Part B).'),
  numberOfQuestions: z.number().describe('The total number of questions for the test.'),
  userId: z.string().describe('The ID of the user requesting the test.'),
});
export type GeneratePartWiseTestInput = z.infer<typeof GeneratePartWiseTestInputSchema>;

const GeneratePartWiseTestOutputSchema = z.object({
  mcqs: z.array(
    z.object({
      question: z.string().describe('The multiple-choice question.'),
      options: z.array(z.string()).describe('Four possible answers.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
      topic: z.string().describe('The topic the question belongs to.'),
      solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
    })
  ).describe('The generated part-wise test questions.'),
});
export type GeneratePartWiseTestOutput = z.infer<typeof GeneratePartWiseTestOutputSchema>;

export async function generatePartWiseTest(input: GeneratePartWiseTestInput): Promise<GeneratePartWiseTestOutput> {
  return generatePartWiseTestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePartWiseTestPrompt',
  input: {schema: z.object({
    examCategory: z.string(),
    part: z.string(),
    numberOfQuestions: z.number(),
    topics: z.array(z.string()),
  })},
  output: {schema: GeneratePartWiseTestOutputSchema},
  prompt: `You are an expert in creating high-quality question papers for competitive exams.

  Your task is to generate a part-wise test with exactly {{numberOfQuestions}} multiple-choice questions for the "{{examCategory}}" exam, focusing on "{{part}}".

  The questions must be distributed across the following topics:
  {{#each topics}}
  - {{this}}
  {{/each}}
  
  Each question must have four possible answers and one correct answer. You must also specify the topic from the list above that each question belongs to.

  For any arithmetic questions, provide a detailed step-by-step solution. For other questions, the solution can be a brief explanation.
  `,
});

const generatePartWiseTestFlow = ai.defineFlow(
  {
    name: 'generatePartWiseTestFlow',
    inputSchema: GeneratePartWiseTestInputSchema,
    outputSchema: GeneratePartWiseTestOutputSchema,
  },
  async (input) => {
    // 1. Fetch all topics from Firestore
    const allTopics = await getTopics();

    // 2. Filter topics based on exam category and part
    const relevantTopics = allTopics.filter(topic => 
        topic.examCategories.includes(input.examCategory as any) &&
        topic.part === input.part
    );

    if (relevantTopics.length === 0) {
        throw new Error(`No topics found for ${input.examCategory} - ${input.part}. Cannot generate test.`);
    }

    const topicTitles = relevantTopics.map(t => t.title);

    // 3. Call the prompt with the filtered list of topics
    const {output} = await prompt({
        examCategory: input.examCategory,
        part: input.part,
        numberOfQuestions: input.numberOfQuestions,
        topics: topicTitles,
    });
    
    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error('The AI could not generate a test for the selected criteria.');
    }
    
    return output;
  }
);
