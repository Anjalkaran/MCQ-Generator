
'use server';
/**
 * @fileOverview Explains a given aptitude concept.
 *
 * - explainAptitudeConcept - A function that handles the concept explanation process.
 * - ExplainAptitudeConceptInput - The input type for the function.
 * - ExplainAptitudeConceptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ExplainAptitudeConceptInputSchema = z.object({
  topic: z.string().describe('The aptitude topic for which to generate an explanation (e.g., "Ages", "Percentage").'),
});
export type ExplainAptitudeConceptInput = z.infer<typeof ExplainAptitudeConceptInputSchema>;

const ExplainAptitudeConceptOutputSchema = z.object({
  concept: z.string().describe('A clear and concise explanation of the core concept.'),
  formulas: z.array(z.object({
    name: z.string().describe('The name of the formula.'),
    formula: z.string().describe('The mathematical formula.'),
    explanation: z.string().describe('A brief explanation of what the formula does and when to use it.'),
  })).describe('A list of key formulas related to the topic.'),
});
export type ExplainAptitudeConceptOutput = z.infer<typeof ExplainAptitudeConceptOutputSchema>;

export async function explainAptitudeConcept(
  input: ExplainAptitudeConceptInput
): Promise<ExplainAptitudeConceptOutput> {
  return explainAptitudeConceptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainAptitudeConceptPrompt',
  input: {schema: ExplainAptitudeConceptInputSchema},
  output: {schema: ExplainAptitudeConceptOutputSchema},
  prompt: `You are an expert tutor for quantitative aptitude. Your task is to explain the core concept and list the key formulas for the given topic.

**Topic:** "{{topic}}"

**Instructions:**
1.  **Concept:** Provide a clear, simple, and concise explanation of the fundamental concept of the topic. Explain it as you would to a beginner.
2.  **Formulas:** Identify the most important and commonly used formulas for this topic. For each formula:
    *   Provide a clear **name** for the formula (e.g., "Percentage Increase", "Simple Interest Calculation").
    *   State the exact **formula**.
    *   Provide a brief **explanation** of what the formula calculates and when it is typically used.

Your output must be structured as a valid JSON object.
`,
});

const explainAptitudeConceptFlow = ai.defineFlow(
  {
    name: 'explainAptitudeConceptFlow',
    inputSchema: ExplainAptitudeConceptInputSchema,
    outputSchema: ExplainAptitudeConceptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI could not generate an explanation for this concept.');
    }
    return output;
  }
);
