
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from provided text or PDF material.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsInput - The input type for the generateMCQs function.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMCQsInputSchema = z.object({
  material: z.string().describe('Text content to generate MCQs from.'),
  topic: z.string().describe('The topic for which MCQs are generated.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
});
export type GenerateMCQsInput = z.infer<typeof GenerateMCQsInputSchema>;

const GenerateMCQsOutputSchema = z.object({
  mcqs: z.array(
    z.object({
      question: z.string().describe('The multiple-choice question.'),
      options: z.array(z.string()).describe('Four possible answers.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

export async function generateMCQs(input: GenerateMCQsInput): Promise<GenerateMCQsOutput> {
  return generateMCQsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMCQsPrompt',
  input: {schema: GenerateMCQsInputSchema},
  output: {schema: GenerateMCQsOutputSchema},
  prompt: `You are an expert in generating multiple-choice questions (MCQs) from a given text material.

  From the material on the topic of "{{topic}}", please generate exactly {{numberOfQuestions}} multiple-choice questions. Each question must have four options and one correct answer.

  Material: {{{material}}}
  `,
});

const generateMCQsFlow = ai.defineFlow(
  {
    name: 'generateMCQsFlow',
    inputSchema: GenerateMCQsInputSchema,
    outputSchema: GenerateMCQsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
