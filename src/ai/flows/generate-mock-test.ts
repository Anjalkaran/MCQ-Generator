
'use server';

/**
 * @fileOverview Generates a mock test based on exam category.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MTS_BLUEPRINT } from '@/lib/exam-blueprints';

const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  numberOfQuestions: z.number().describe('The total number of questions for the mock test.'),
});
export type GenerateMockTestInput = z.infer<typeof GenerateMockTestInputSchema>;

const GenerateMockTestOutputSchema = z.object({
  mcqs: z.array(
    z.object({
      question: z.string().describe('The multiple-choice question.'),
      options: z.array(z.string()).describe('Four possible answers.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
      topic: z.string().describe('The topic the question belongs to.'),
    })
  ).describe('The generated mock test questions.'),
});
export type GenerateMockTestOutput = z.infer<typeof GenerateMockTestOutputSchema>;

export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMockTestPrompt',
  input: {schema: GenerateMockTestInputSchema},
  output: {schema: GenerateMockTestOutputSchema},
  prompt: `You are an expert in creating mock tests for Indian Postal Department exams.

  Your task is to generate a mock test with exactly {{numberOfQuestions}} multiple-choice questions for the "{{examCategory}}" exam.
  
  You MUST strictly follow the provided blueprint for the exam structure, topic distribution, and question count per topic.

  --- EXAM BLUEPRINT ({{examCategory}}) ---
  {{{blueprint}}}
  --- END BLUEPRINT ---

  For each question generated, you must specify which topic from the blueprint it belongs to in the 'topic' field of the output.
  Ensure the questions are relevant and accurately reflect the style and difficulty of the actual exam.
  `,
});

const generateMockTestFlow = ai.defineFlow(
  {
    name: 'generateMockTestFlow',
    inputSchema: GenerateMockTestInputSchema,
    outputSchema: GenerateMockTestOutputSchema,
  },
  async input => {
    let blueprint = '';
    // In the future, we can add more blueprints and select them here.
    if (input.examCategory === 'MTS') {
      blueprint = JSON.stringify(MTS_BLUEPRINT, null, 2);
    } else {
        throw new Error(`No blueprint found for exam category: ${input.examCategory}`);
    }

    const {output} = await prompt({ ...input, blueprint });
    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error('The AI could not generate a mock test for the selected exam type.');
    }
    return output;
  }
);
