
'use server';

/**
 * @fileOverview Generates a practice test for an entire part of an exam syllabus.
 *
 * - generatePartwiseMCQs - A function that handles the quiz generation process.
 * - GeneratePartwiseMCQsInput - The input type for the generatePartwiseMCQs function.
 * - GeneratePartwiseMCQsOutput - The return type for the generatePartwiseMCQs function.
 */

import { config } from 'dotenv';
config();

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getTopicsByPartAndExam, getAllUserQuestions, getReasoningQuestionsForPartwiseTest } from '@/lib/firestore';
import type { MCQ, ReasoningQuestion } from '@/lib/types';

const GeneratePartwiseMCQsInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.enum(['Part A', 'Part B']).describe('The syllabus part (Part A or Part B).'),
  numberOfQuestions: z.number().describe('The total number of questions to generate for the part.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
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

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

Your task is to generate EXACTLY **{{questionCount}}** questions for **{{part}}**.

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
    const { examCategory, part, numberOfQuestions, userId, language } = input;

    const topicsForPart = await getTopicsByPartAndExam(part, examCategory);
    if (topicsForPart.length === 0) {
      throw new Error(`No topics found for ${examCategory} - ${part}.`);
    }
    
    let generatedMCQs: MCQ[] = [];
    let questionsToGenerateFromPrompt = numberOfQuestions;

    // If Part B, check for reasoning questions
    if (part === 'Part B') {
        const reasoningQuestions = await getReasoningQuestionsForPartwiseTest(examCategory);
        const reasoningCategoryName = "Reasoning and Analytical Ability";
        const reasoningTopics = topicsForPart.filter(t => t.categoryName === reasoningCategoryName);

        if (reasoningTopics.length > 0 && reasoningQuestions.length > 0) {
            // Allocate a portion of questions to reasoning, e.g., 20% or up to a max of 10
            const numReasoningQuestions = Math.min(10, Math.floor(numberOfQuestions * 0.2));
            
            if (reasoningQuestions.length >= numReasoningQuestions) {
                const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, numReasoningQuestions);
                
                const formattedReasoningMCQs: MCQ[] = selectedReasoning.map((q: ReasoningQuestion) => ({
                    question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                    topic: q.topic,
                }));

                generatedMCQs.push(...formattedReasoningMCQs);
                questionsToGenerateFromPrompt -= numReasoningQuestions;
            }
        }
    }

    // Filter out reasoning topics from the list for the prompt
    const nonReasoningTopics = topicsForPart.filter(t => t.categoryName !== "Reasoning and Analytical Ability");
    
    if (questionsToGenerateFromPrompt > 0 && nonReasoningTopics.length > 0) {
        const topicsString = nonReasoningTopics.map(topic => `- ${topic.title}`).join('\n');
        const previousQuestions = await getAllUserQuestions(userId);

        const { output } = await generateQuestionsForTopicsPrompt({
            examCategory,
            part,
            topics: topicsString,
            questionCount: questionsToGenerateFromPrompt,
            previousQuestions: previousQuestions,
            language,
        });
        
        if (output && output.questions) {
            generatedMCQs.push(...output.questions);
        }
    }
    
    if (generatedMCQs.length === 0) {
        throw new Error('The AI could not generate any questions for the selected part.');
    }

    // Shuffle the final list of questions
    const finalMCQs = generatedMCQs.sort(() => 0.5 - Math.random());
    
    return { mcqs: finalMCQs };
  }
);
