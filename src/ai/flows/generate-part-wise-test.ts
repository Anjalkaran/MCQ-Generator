
'use server';

/**
 * @fileOverview Generates a part-wise test with MCQs from multiple topics.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getTopicsByPartAndExam, getQuestionBankByCategory } from '@/lib/firestore';
import type { GenerateMCQsOutput } from './generate-mcqs'; 
import { arithmeticSolverPrompt } from './generate-mcqs';

const PartWiseInputSchema = z.object({
  examCategory: z.string().describe('The target exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.string().describe('The part of the syllabus (e.g., Part A, Part B).'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  difficulty: z.string().describe('The difficulty level of the questions.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  topicTitles: z.array(z.string()).describe('A list of topic titles within this part.'),
  material: z.string().optional().describe('Combined study material for all topics in the part.'),
  bankedQuestions: z.string().optional().describe('Content from previously uploaded exam questions.'),
});

const generatePartWiseTestPrompt = ai.definePrompt({
  name: 'generatePartWiseTestPrompt',
  input: { schema: PartWiseInputSchema },
  output: { schema: GenerateMCQsOutput }, // Re-using the same output schema
  prompt: `You are an expert in generating a comprehensive test that covers an entire part of a syllabus.

  Generate exactly {{numberOfQuestions}} multiple-choice questions for {{examCategory}} - {{part}}. The questions should be of "{{difficulty}}" difficulty.

  The questions should be drawn from the following topics:
  {{#each topicTitles}}
  - {{this}}
  {{/each}}

  --- PRIMARY RULE: SOURCE OF TRUTH ---
  {{#if material}}
    Your PRIMARY source of truth is the 'MATERIAL' provided below. All questions MUST be based on it. Banked questions can be used for style/format reference ONLY, but if there's a conflict, the MATERIAL always wins.
    --- MATERIAL START ---
    {{{material}}}
    --- MATERIAL END ---
  {{else}}
    Generate questions based on general knowledge for these topics, using the banked questions for style and format.
  {{/if}}

  {{#if bankedQuestions}}
  --- REFERENCE QUESTIONS START ---
  {{{bankedQuestions}}}
  --- REFERENCE QUESTIONS END ---
  {{/if}}

  --- ARITHMETIC INSTRUCTION ---
  If you generate an arithmetic problem, the 'solution' field MUST BE an empty string (""). The solution will be generated separately. DO NOT generate a solution here.
  `,
});

export async function generatePartWiseTest(input: z.infer<typeof GenerateMCQsInputSchema>): Promise<GenerateMCQsOutput> {
  return generatePartWiseTestFlow(input);
}

export const generatePartWiseTestFlow = ai.defineFlow(
  {
    name: 'generatePartWiseTestFlow',
    inputSchema: z.object({
        examCategory: z.string(),
        part: z.string(),
        numberOfQuestions: z.number(),
        difficulty: z.string(),
        userId: z.string(),
    }),
    outputSchema: GenerateMCQsOutput,
  },
  async (input) => {
    if (!input.userId || !input.examCategory || !input.part) {
      throw new Error("User ID, Exam Category, and Part must be provided.");
    }

    // 1. Fetch all topics for the given part and exam
    const topics = await getTopicsByPartAndExam(input.part, input.examCategory);
    if (topics.length === 0) {
      throw new Error(`No topics found for ${input.examCategory} - ${input.part}.`);
    }

    const topicTitles = topics.map(t => t.title);
    const combinedMaterial = topics.map(t => t.material).filter(Boolean).join('\n\n---\n\n');

    // 2. Fetch banked questions (handling the POSTMAN -> MTS rule)
    const categoryForBank = input.examCategory === 'POSTMAN' ? 'MTS' : input.examCategory;
    const bankedQuestions = await getQuestionBankByCategory(categoryForBank);

    // 3. Prepare input for the AI prompt
    const flowInput: z.infer<typeof PartWiseInputSchema> = {
      ...input,
      topicTitles,
      material: combinedMaterial || undefined,
      bankedQuestions: bankedQuestions || undefined,
    };

    // 4. Generate the initial set of questions
    const { output: initialOutput } = await generatePartWiseTestPrompt(flowInput);
    if (!initialOutput || !initialOutput.mcqs || initialOutput.mcqs.length === 0) {
      throw new Error('The AI could not generate questions for the selected part.');
    }

    // 5. Generate solutions for any arithmetic problems
    for (const mcq of initialOutput.mcqs) {
        const isArithmetic = /calculate|how many|what is the|find the value|average|profit|loss|interest|speed|time|distance/i.test(mcq.question) && mcq.question.match(/\d/);

        if (isArithmetic) {
             try {
                const solutionResponse = await arithmeticSolverPrompt({ problem: mcq.question });
                const solution = solutionResponse.output;

                if (solution) {
                    mcq.solution = solution.steps.join('\n');
                }
            } catch (e) {
                console.error("Failed to generate a detailed solution for a part-wise question:", e);
                mcq.solution = "A detailed solution could not be generated for this problem.";
            }
        }
    }

    return initialOutput;
  }
);
