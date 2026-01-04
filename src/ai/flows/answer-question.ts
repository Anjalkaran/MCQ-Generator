
'use server';
/**
 * @fileOverview Answers a user's question based on provided study material or general knowledge if no material is available.
 *
 * - answerQuestion - A function that handles the question answering process.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { logQnAUSage } from '@/lib/firestore';

const AnswerQuestionInputSchema = z.object({
  material: z.string().optional().describe('The study material to search for the answer, if available.'),
  question: z.string().describe('The user\'s question.'),
  topic: z.string().describe('The topic of the question.'),
  userId: z.string().describe('The ID of the user asking the question.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question, based on the provided context.'),
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
  model: googleAI.model('gemini-pro'),
  prompt: `You are a helpful assistant for postal exam preparation.

First, check if the user's question is relevant to the specified topic.
Topic: "{{topic}}"
User's Question: "{{question}}"

If the question is NOT relevant to the topic, your ONLY response MUST be: "Please ask a question that is relevant to the topic of '{{topic}}'." Do not answer the irrelevant question.

If the question IS relevant, proceed with the following instructions to answer it.

{{#if material}}
--- CRITICAL INSTRUCTIONS (MATERIAL PROVIDED) ---
1.  Your entire answer MUST be derived from the 'STUDY MATERIAL' provided below.
2.  Do not use any external knowledge or information outside of the provided text.
3.  If the answer cannot be found in the material, you MUST state: "I could not find an answer to your question in the provided study material."
4.  Answer concisely and directly.

--- STUDY MATERIAL START ---
{{{material}}}
--- STUDY MATERIAL END ---

{{else}}
--- INSTRUCTIONS (NO MATERIAL PROVIDED) ---
1. You are an expert tutor for this topic.
2. Answer the user's question to the best of your ability using your general knowledge.
3. Provide a clear, concise, and accurate answer suitable for someone preparing for an exam.
{{/if}}

--- USER'S QUESTION (for answering) ---
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
    
    // Log the usage only on successful answer generation
    if (input.userId && input.topic) {
        await logQnAUSage(input.userId, input.topic);
    }
    
    return output;
  }
);
