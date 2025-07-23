
'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ } from '@/lib/types';
import { getAllUserQuestions } from '@/lib/firestore';

const ArithmeticSolutionSchema = z.object({
    steps: z.array(z.string()).describe("An array of strings, where each string is a single step in the calculation using the LCM method."),
    final_answer: z.string().describe("A string containing only the final, mathematically exact answer."),
});

const arithmeticSolverPrompt = ai.definePrompt({
    name: 'arithmeticSolverPrompt',
    input: { schema: z.object({ problem: z.string(), language: z.string().optional().default('English') }) },
    output: { schema: ArithmeticSolutionSchema },
    prompt: `You are a precise mathematical solver AI. Your sole purpose is to solve the given word problem and provide a step-by-step solution and an exact final answer.
Your output MUST be a valid JSON object. Do not include any text, apologies, or explanations outside of the JSON structure itself.
The language of the solution MUST be {{language}}.
The JSON object must have two keys:
1.  "steps": An array of strings. Each string must be a single, clear step in the calculation. For work-rate problems like this, use the LCM (Least Common Multiple) method.
2.  "final_answer": A string containing only the final, mathematically exact answer. Express it as a fraction or a decimal (e.g., "18.75 days" or "75/4 days").
CRITICAL INSTRUCTIONS:
-   Do NOT mention or analyze any multiple-choice options that might be in the problem description. Ignore them completely.
-   Do NOT guess or select the "closest" answer. Calculate and provide only the true mathematical result.
-   Do NOT use conversational language. Stick to formal, mathematical steps.
Now, solve the following problem according to all the rules above:
Problem: "{{problem}}"`,
});

const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated test (e.g., "English", "Tamil").'),
});
export type GenerateMockTestInput = z.infer<typeof GenerateMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
});

const GenerateMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestOutput = z.infer<typeof GenerateMockTestOutputSchema>;

const generateQuestionsForSectionPrompt = ai.definePrompt({
    name: 'generateQuestionsForSectionPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            sectionName: z.string(),
            topics: z.string(),
            questionCount: z.number(),
            previousQuestions: z.array(z.string()).optional().describe('A list of previously asked questions to avoid repetition.'),
            language: z.string().optional().default('English'),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert in creating mock test questions for the Indian Postal Department's {{examCategory}} exam.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**IMPORTANT RULE FOR TAMIL:** When translating to Tamil, you MUST keep all technical postal terms, scheme names, and abbreviations (e.g., "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman") in English.

Your task is to generate EXACTLY **{{questionCount}}** questions for the section named **"{{sectionName}}"**.

These questions must cover the following topics:
{{{topics}}}

For each generated question, you MUST specify its topic in the 'topic' field from the list above.
For any arithmetic questions, the 'solution' field MUST be an empty string ("").

{{#if previousQuestions}}
  IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
  {{#each previousQuestions}}
  - "{{this}}"
  {{/each}}
{{/if}}

Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
`,
});


export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const CHUNK_SIZE = 10;

const generateMockTestFlow = ai.defineFlow(
  {
    name: 'generateMockTestFlow',
    inputSchema: GenerateMockTestInputSchema,
    outputSchema: GenerateMockTestOutputSchema,
  },
  async input => {
    let blueprint;
    if (input.examCategory === 'MTS') blueprint = MTS_BLUEPRINT;
    else if (input.examCategory === 'POSTMAN') blueprint = POSTMAN_BLUEPRINT;
    else if (input.examCategory === 'PA') blueprint = PA_BLUEPRINT;
    else throw new Error(`No blueprint found for exam category: ${input.examCategory}`);
    
    const previousQuestions = await getAllUserQuestions(input.userId);
    const allQuestions: MCQ[] = [];

    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        const topicsString = section.topics.map((topic: any) => {
          const topicName = (typeof topic === 'string') ? topic : topic.name;
          return `- ${topicName}`;
        }).join('\n');
        
        let questionsToGenerate = section.questions;
        
        // Process requests sequentially for each section to avoid overwhelming the API
        while(questionsToGenerate > 0) {
            const currentChunkSize = Math.min(questionsToGenerate, CHUNK_SIZE);
            
            const { output } = await generateQuestionsForSectionPrompt({
                examCategory: input.examCategory,
                sectionName: section.sectionName,
                topics: topicsString,
                questionCount: currentChunkSize,
                previousQuestions: [...previousQuestions, ...allQuestions.map(q => q.question)], // Include already generated questions
                language: input.language,
            });

            if (output && output.questions) {
                allQuestions.push(...output.questions);
            }
            questionsToGenerate -= currentChunkSize;
        }
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allQuestions.length !== totalExpectedQuestions) { 
        console.warn(`Generated question count mismatch. Expected ${totalExpectedQuestions}, but got ${allQuestions.length}.`);
    }

    const arithmeticSection = blueprint.parts.flatMap(p => p.sections).find(s => s.sectionName.includes('Arithmetic'));
    if (arithmeticSection) {
        const arithmeticTopicNames = arithmeticSection.topics.map((t: any) => (typeof t === 'string' ? t : t.name));
        
        const solutionPromises = allQuestions
            .filter(mcq => mcq.topic && arithmeticTopicNames.includes(mcq.topic))
            .map(async (mcq) => {
                try {
                    const solutionResponse = await arithmeticSolverPrompt({ problem: mcq.question, language: input.language });
                    if (solutionResponse.output) {
                        mcq.solution = solutionResponse.output.steps.join('\n');
                    }
                } catch (e) {
                    console.error("Failed to generate a detailed solution for a mock test question:", e);
                    mcq.solution = "A detailed solution could not be generated for this problem.";
                }
            });
        
        await Promise.all(solutionPromises);
    }
    
    return { mcqs: allQuestions };
  }
);

    
