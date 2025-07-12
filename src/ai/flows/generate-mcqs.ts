
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
import pdf from 'pdf-parse/lib/pdf-parse.js';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  topicMaterial: z
    .string()
    .optional()
    .describe(
      "The base64 encoded content of the material (PDF or text) to be used for generating questions. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
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
  let materialContent = '';
  if (input.topicMaterial) {
    const [header, base64Data] = input.topicMaterial.split(',');
    if (!header || !base64Data) {
      throw new Error('Invalid topic material format. Expected a data URI.');
    }
    const buffer = Buffer.from(base64Data, 'base64');

    if (header.includes('application/pdf')) {
      const data = await pdf(buffer);
      materialContent = data.text;
    } else if (header.includes('text/plain')) {
      materialContent = buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
    }
  }
  
  const flowInput = {
    ...input,
    topicMaterial: materialContent, // Pass extracted text to the flow
  };

  return generateMCQsFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'generateMCQsPrompt',
  input: {schema: z.object({
      topic: z.string(),
      numberOfQuestions: z.number(),
      topicMaterial: z.string().optional(),
  })},
  output: {schema: GenerateMCQsOutputSchema},
  prompt: `You are an expert in generating multiple-choice questions (MCQs).

  Please generate exactly {{numberOfQuestions}} multiple-choice questions on the topic of "{{topic}}". Each question must have four options and one correct answer.

  {{#if topicMaterial}}
  IMPORTANT: Use the following material as the primary source of truth for generating the questions. All questions, options, and answers must be derived directly from this text.

  <MATERIAL>
  {{{topicMaterial}}}
  </MATERIAL>
  {{/if}}
  `,
});

const generateMCQsFlow = ai.defineFlow(
  {
    name: 'generateMCQsFlow',
    inputSchema: z.object({
        topic: z.string(),
        numberOfQuestions: z.number(),
        topicMaterial: z.string().optional(),
    }),
    outputSchema: GenerateMCQsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error('The AI could not generate questions from the provided material.');
    }
    return output;
  }
);
