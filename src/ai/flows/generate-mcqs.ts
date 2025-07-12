
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsInput - The input type for the generateMCQs function.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  material: z.string().optional().describe('The study material for the topic, if available.'),
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
  prompt: `You are an expert in generating multiple-choice questions (MCQs).

  {{#if material}}
  Please generate exactly {{numberOfQuestions}} multiple-choice questions based on the following material about "{{topic}}". Each question must have four options and one correct answer.

  Material:
  {{{material}}}
  {{else}}
  Please generate exactly {{numberOfQuestions}} multiple-choice questions on the topic of "{{topic}}". Each question must have four options and one correct answer.
  {{/if}}
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
    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error('The AI could not generate questions for the selected topic.');
    }
    return output;
  }
);
