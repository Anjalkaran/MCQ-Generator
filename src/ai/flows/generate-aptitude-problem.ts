'use server';
/**
 * @fileOverview Generates aptitude problems with step-by-step solutions.
 *
 * - generateAptitudeProblem - A function that handles the problem generation process.
 * - GenerateAptitudeProblemInput - The input type for the function.
 * - GenerateAptitudeProblemOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const GenerateAptitudeProblemInputSchema = z.object({
  topic: z.string().describe('The aptitude topic for which to generate a problem (e.g., "Ages", "Percentage", "Profit and Loss").'),
  previousQuestions: z.array(z.string()).optional().describe('A list of previously generated questions to avoid repetition.'),
});
export type GenerateAptitudeProblemInput = z.infer<typeof GenerateAptitudeProblemInputSchema>;

const GenerateAptitudeProblemOutputSchema = z.object({
  question: z.string().describe('The text of the generated aptitude problem.'),
  detailedSolution: z.string().describe('A detailed, step-by-step explanation of how to solve the problem.'),
});
export type GenerateAptitudeProblemOutput = z.infer<typeof GenerateAptitudeProblemOutputSchema>;

export async function generateAptitudeProblem(
  input: GenerateAptitudeProblemInput
): Promise<GenerateAptitudeProblemOutput> {
  return generateAptitudeProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAptitudeProblemPrompt',
  input: {schema: GenerateAptitudeProblemInputSchema},
  output: {schema: GenerateAptitudeProblemOutputSchema},
  model: googleAI.model('gemini-1.5-pro'),
  prompt: `You are an expert tutor specializing in quantitative aptitude for Indian competitive exams. Your task is to generate a single, unique, high-quality aptitude problem based on the given topic.

**CRITICAL INSTRUCTIONS:**
1.  **Topic:** The problem MUST be based on the topic of: "{{topic}}".
2.  **Uniqueness:** The problem MUST NOT be the same as or too similar to any of the questions in the 'PREVIOUSLY GENERATED QUESTIONS' list below.
3.  **Question:** Generate a clear, concise, and challenging problem statement.
4.  **Solution:** Provide a very detailed, step-by-step solution that is easy for a student to understand. Explain the logic, formulas used, and calculations clearly. The solution should guide the user from the problem statement to the final answer.

{{#if previousQuestions}}
--- PREVIOUSLY GENERATED QUESTIONS (DO NOT REPEAT) ---
{{#each previousQuestions}}
- {{{this}}}
{{/each}}
--- END PREVIOUSLY GENERATED QUESTIONS ---
{{/if}}

Generate the question and the detailed solution.
`,
});

const generateAptitudeProblemFlow = ai.defineFlow(
  {
    name: 'generateAptitudeProblemFlow',
    inputSchema: GenerateAptitudeProblemInputSchema,
    outputSchema: GenerateAptitudeProblemOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI could not generate an aptitude problem.');
    }
    return output;
  }
);
