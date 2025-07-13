
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
import { getUserData } from '@/lib/firestore';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  category: z.string().optional().describe('The parent category of the topic.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  difficulty: z.string().describe('The difficulty level of the questions (e.g., Easy, Moderate, Difficult).'),
  material: z.string().optional().describe('The study material for the topic, if available.'),
  previousQuestions: z.array(z.string()).optional().describe('A list of previously asked questions to avoid repetition.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
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

const FREE_TOPIC_EXAM_LIMIT = 1;
const ADMIN_EMAIL = "admin@anjalkaran.com";

const prompt = ai.definePrompt({
  name: 'generateMCQsPrompt',
  input: {schema: GenerateMCQsInputSchema},
  output: {schema: GenerateMCQsOutputSchema},
  prompt: `You are an expert in generating multiple-choice questions (MCQs).

  Please generate exactly {{numberOfQuestions}} multiple-choice questions on the topic of "{{topic}}". Each question must have four options and one correct answer.
  
  The difficulty level for these questions should be "{{difficulty}}".
  
  {{#ifEquals category "General Awareness"}}
    {{#ifEquals topic "Current Affairs"}}
      When generating questions for "Current Affairs", focus on the period between January 2024 to June 2025.
    {{else}}
      For other topics in General Awareness, please refer to NCERT school text books and MCQs from reputable coaching centers like Suresh IAS Academy and SSA Adda to ensure the questions are relevant and of high quality.
    {{/ifEquals}}
  {{/ifEquals}}

  {{#if material}}
    Use the following material as the primary source for generating the questions.
    
    {{#ifEquals difficulty "Difficult"}}
      Generate statement-based questions and questions that test conceptual understanding based on the material. These questions should require deeper analysis rather than simple fact recall.
    {{else}}
      Generate direct questions based on the facts and information presented in the material.
    {{/ifEquals}}

    Material:
    {{{material}}}
  {{/if}}

  {{#if previousQuestions}}
  IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
  {{#each previousQuestions}}
  - "{{this}}"
  {{/each}}
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

    // Server-side check for user exam limit
    const userData = await getUserData(input.userId);
    if (!userData) {
      throw new Error("User not found. Cannot generate quiz.");
    }
    
    const isAdmin = userData.email === ADMIN_EMAIL;
    const isPaid = userData.paymentStatus === 'paid';

    // Enforce limit only for non-admin, non-paid users
    if (!isAdmin && !isPaid && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT) {
      throw new Error(`You have used all your ${FREE_TOPIC_EXAM_LIMIT} free exams. Please upgrade to continue.`);
    }

    const {output} = await prompt(input);
    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error('The AI could not generate questions for the selected topic.');
    }
    return output;
  }
);
