'use server';
/**
 * @fileOverview Summarizes topic material to provide users with a quick overview before taking a quiz.
 *
 * - summarizeTopicMaterial - A function that summarizes the topic material.
 * - SummarizeTopicMaterialInput - The input type for the summarizeTopicMaterial function.
 * - SummarizeTopicMaterialOutput - The return type for the summarizeTopicMaterial function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTopicMaterialInputSchema = z.object({
  topicMaterial: z
    .string()
    .describe('The topic material (text/PDF content) to be summarized.'),
});
export type SummarizeTopicMaterialInput = z.infer<
  typeof SummarizeTopicMaterialInputSchema
>;

const SummarizeTopicMaterialOutputSchema = z.object({
  summary: z.string().describe('A short summary of the topic material.'),
});
export type SummarizeTopicMaterialOutput = z.infer<
  typeof SummarizeTopicMaterialOutputSchema
>;

export async function summarizeTopicMaterial(
  input: SummarizeTopicMaterialInput
): Promise<SummarizeTopicMaterialOutput> {
  return summarizeTopicMaterialFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTopicMaterialPrompt',
  input: {schema: SummarizeTopicMaterialInputSchema},
  output: {schema: SummarizeTopicMaterialOutputSchema},
  prompt: `Summarize the following topic material in a concise manner:

{{{topicMaterial}}}`,
});

const summarizeTopicMaterialFlow = ai.defineFlow(
  {
    name: 'summarizeTopicMaterialFlow',
    inputSchema: SummarizeTopicMaterialInputSchema,
    outputSchema: SummarizeTopicMaterialOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
