
'use server';
/**
 * @fileOverview Answers a user's question based on provided study material.
 *
 * - answerQuestion - A function that handles the question answering process.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnswerQuestionInputSchema = z.object({
  material: z.string().describe('The study material to search for the answer.'),
  question: z.string().describe('The user\'s question.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question, based on the provided material.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(
  input: AnswerQuestionInput
): Promise<AnswerQuestionOutput> {
  return answerQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionPrompt',
  input: { schema: AnswerQuestionInputSchema },
  output: { schema: AnswerQuestionOutputSchema },
  prompt: `You are a helpful assistant for postal exam preparation. Your task is to answer the user's question based *only* on the provided study material.

CRITICAL RULES:
1.  Your entire answer must be derived from the 'STUDY MATERIAL' below.
2.  Do not use any external knowledge or information outside of the provided text.
3.  If the answer cannot be found in the material, you MUST state: "I could not find an answer to your question in the provided study material."
4.  Answer concisely and directly.

--- STUDY MATERIAL START ---
{{{material}}}
--- STUDY MATERIAL END ---

--- USER'S QUESTION ---
"{{{question}}}"
`,
});

const answerQuestionFlow = ai.defineFlow(
  {
    name: 'answerQuestionFlow',
    inputSchema: AnswerQuestionInputSchema,
    outputSchema: AnswerQuestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI could not generate an answer.');
    }
    return output;
  }
);
