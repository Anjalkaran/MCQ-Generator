
'use server';

/**
 * @fileOverview Generates a practice test for an entire part of an exam syllabus.
 *
 * - generatePartwiseMCQs - A function that handles the quiz generation process.
 * - GeneratePartwiseMCQsInput - The input type for the generatePartwiseMCQs function.
 * - GeneratePartwiseMCQsOutput - The return type for the generatePartwiseMCQs function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getTopicsByPartAndExam, getAllUserQuestions } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';

const GeneratePartwiseMCQsInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.enum(['Part A', 'Part B']).describe('The syllabus part (Part A or Part B).'),
  numberOfQuestions: z.number().describe('The total number of questions to generate for the part.'),
  difficulty: z.string().describe('The difficulty level for the questions.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil").'),
});
export type GeneratePartwiseMCQsInput = z.infer<typeof GeneratePartwiseMCQsInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
});

const GeneratePartwiseMCQsOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated practice quiz questions.'),
});
export type GeneratePartwiseMCQsOutput = z.infer<typeof GeneratePartwiseMCQsOutputSchema>;

const generateQuestionsForTopicsPrompt = ai.definePrompt({
    name: 'generateQuestionsForTopicsPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            part: z.string(),
            difficulty: z.string(),
            topics: z.string(),
            questionCount: z.number(),
            previousQuestions: z.array(z.string()).optional(),
            language: z.string().optional().default('English'),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert in creating high-quality practice questions for the Indian Postal Department's {{examCategory}} exam.

**CRITICAL: The language for the entire output (question, options, correctAnswer, and solution) MUST be {{language}}.**

Your task is to generate EXACTLY **{{questionCount}}** questions for **{{part}}** with a **"{{difficulty}}"** difficulty level.

The questions must cover the following topics. Distribute the questions evenly across the topics.
{{{topics}}}

For each generated question, you MUST specify its source topic in the 'topic' field from the list above.
For any arithmetic questions, the 'solution' field MUST be an empty string (""). Solutions will be handled separately.

{{#if previousQuestions}}
  IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique.
  {{#each previousQuestions}}
  - "{{this}}"
  {{/each}}
{{/if}}

Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
`,
});

export async function generatePartwiseMCQs(input: GeneratePartwiseMCQsInput): Promise<GeneratePartwiseMCQsOutput> {
  return generatePartwiseMCQsFlow(input);
}

const generatePartwiseMCQsFlow = ai.defineFlow(
  {
    name: 'generatePartwiseMCQsFlow',
    inputSchema: GeneratePartwiseMCQsInputSchema,
    outputSchema: GeneratePartwiseMCQsOutputSchema,
  },
  async input => {
    const { examCategory, part, numberOfQuestions, difficulty, userId, language } = input;

    const topicsForPart = await getTopicsByPartAndExam(part, examCategory);
    if (topicsForPart.length === 0) {
      throw new Error(`No topics found for ${examCategory} - ${part}.`);
    }

    const topicsString = topicsForPart.map(topic => `- ${topic.title}`).join('\n');
    const previousQuestions = await getAllUserQuestions(userId);

    const { output } = await generateQuestionsForTopicsPrompt({
        examCategory,
        part,
        difficulty,
        topics: topicsString,
        questionCount: numberOfQuestions,
        previousQuestions: previousQuestions,
        language,
    });
    
    if (!output || !output.questions || output.questions.length === 0) {
        throw new Error('The AI could not generate questions for the selected part.');
    }

    // TODO: Add arithmetic solver logic if needed, similar to mock test flow.
    
    return { mcqs: output.questions };
  }
);
