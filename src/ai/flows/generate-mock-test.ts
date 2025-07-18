
'use server';

/**
 * @fileOverview Generates a mock test based on exam category.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';

const ArithmeticSolutionSchema = z.object({
    steps: z.array(z.string()).describe("An array of strings, where each string is a single step in the calculation using the LCM method."),
    final_answer: z.string().describe("A string containing only the final, mathematically exact answer."),
});

const arithmeticSolverPrompt = ai.definePrompt({
    name: 'arithmeticSolverPrompt',
    input: { schema: z.object({ problem: z.string() }) },
    output: { schema: ArithmeticSolutionSchema },
    prompt: `You are a precise mathematical solver AI. Your sole purpose is to solve the given word problem and provide a step-by-step solution and an exact final answer.

Your output MUST be a valid JSON object. Do not include any text, apologies, or explanations outside of the JSON structure itself.

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
  numberOfQuestions: z.number().describe('The total number of questions for the mock test.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
});
export type GenerateMockTestInput = z.infer<typeof GenerateMockTestInputSchema>;

const GenerateMockTestOutputSchema = z.object({
  mcqs: z.array(
    z.object({
      question: z.string().describe('The multiple-choice question.'),
      options: z.array(z.string()).describe('Four possible answers.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
      topic: z.string().describe('The topic the question belongs to.'),
      solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
    })
  ).describe('The generated mock test questions.'),
});
export type GenerateMockTestOutput = z.infer<typeof GenerateMockTestOutputSchema>;

export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMockTestPrompt',
  input: {schema: GenerateMockTestInputSchema.extend({ blueprint: z.string() })},
  output: {schema: GenerateMockTestOutputSchema},
  prompt: `You are an expert in creating mock tests for Indian Postal Department exams.

  Your task is to generate a mock test for the "{{examCategory}}" exam.

  --- CRITICAL RULE: QUESTION COUNT ---
  You MUST generate EXACTLY {{numberOfQuestions}} multiple-choice questions in total. This is the absolute final number of questions required. Do not exceed this number.
  
  You MUST strictly follow the provided blueprint for the exam structure and topic distribution. Use the blueprint to guide the number of questions from each section, but ensure the grand total is precisely {{numberOfQuestions}}.

  --- EXAM BLUEPRINT ({{examCategory}}) ---
  {{{blueprint}}}
  --- END BLUEPRINT ---

  For each question generated, you must specify which topic from the blueprint it belongs to in the 'topic' field of the output.
  Ensure the questions are relevant and accurately reflect the style and difficulty of the actual exam.
  
  --- ARITHMETIC INSTRUCTION ---
  If you generate an arithmetic problem from the 'Basic Arithmetic' section, the 'solution' field MUST BE an empty string (""). The solution will be generated separately. DO NOT generate a solution here.
  `,
});

const generateMockTestFlow = ai.defineFlow(
  {
    name: 'generateMockTestFlow',
    inputSchema: GenerateMockTestInputSchema,
    outputSchema: GenerateMockTestOutputSchema,
  },
  async input => {
    let blueprint = '';
    
    if (input.examCategory === 'MTS') {
      blueprint = JSON.stringify(MTS_BLUEPRINT, null, 2);
    } else if (input.examCategory === 'POSTMAN') {
      blueprint = JSON.stringify(POSTMAN_BLUEPRINT, null, 2);
    } else if (input.examCategory === 'PA') {
      blueprint = JSON.stringify(PA_BLUEPRINT, null, 2);
    } else {
        throw new Error(`No blueprint found for exam category: ${input.examCategory}`);
    }

    const {output} = await prompt({ ...input, blueprint });
    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error('The AI could not generate a mock test for the selected exam type.');
    }

    const arithmeticTopics = ["Basic Arithmetic", "Basic Arithmetics"];
    for (const mcq of output.mcqs) {
        if (arithmeticTopics.includes(mcq.topic)) {
             try {
                const solutionResponse = await arithmeticSolverPrompt({ problem: mcq.question });
                if (solutionResponse.output) {
                    mcq.solution = solutionResponse.output.steps.join('\n');
                }
            } catch (e) {
                console.error("Failed to generate a detailed solution for a mock test question:", e);
                mcq.solution = "A detailed solution could not be generated for this problem.";
            }
        }
    }


    return output;
  }
);
