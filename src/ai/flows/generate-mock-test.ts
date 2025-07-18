
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
  userId: z.string().describe('The ID of the user requesting the quiz.'),
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

export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const generateMockTestPrompt = ai.definePrompt({
    name: 'generateMockTestPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            blueprint: z.any(),
            totalQuestions: z.number(),
            partAQuestions: z.number(),
            partBQuestions: z.number(),
        })
    },
    output: { schema: GenerateMockTestOutputSchema },
    prompt: `You are an expert in creating mock tests for Indian Postal Department exams. Your task is to generate a complete mock test based on the provided blueprint.

--- CRITICAL HARD STOP RULE ---
You MUST generate EXACTLY {{totalQuestions}} questions in total. No more, no less. This is the most important rule.

--- PART-WISE GENERATION RULE ---
1.  First, generate EXACTLY {{partAQuestions}} questions for Part-A.
2.  Then, generate EXACTLY {{partBQuestions}} questions for Part-B.
The final output must contain {{totalQuestions}} questions in the 'mcqs' array.

--- EXAM BLUEPRINT ---
Use the following blueprint as a guide for topics and structure:
{{{json blueprint}}}
--- END BLUEPRINT ---

ADDITIONAL CRITICAL RULES:
-   For each question, you MUST specify which topic from the blueprint it belongs to in the 'topic' field of the output.
-   Every single object in the 'mcqs' array MUST have all required fields: 'question', 'options', 'correctAnswer', and 'topic'.
-   If a question is an arithmetic problem (e.g., from 'Basic Arithmetic'), the 'solution' field MUST BE an empty string (""). It will be generated later.
`,
});


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

    const partAQuestions = blueprint.parts.find(p => p.partName === 'Part-A')?.totalQuestions || 0;
    const partBQuestions = blueprint.parts.find(p => p.partName === 'Part-B')?.totalQuestions || 0;
    const totalQuestions = partAQuestions + partBQuestions;

    const { output } = await generateMockTestPrompt({
        examCategory: input.examCategory,
        blueprint: blueprint,
        totalQuestions,
        partAQuestions,
        partBQuestions,
    });

    if (!output || !output.mcqs) {
         throw new Error(`The AI could not generate a mock test.`);
    }
    
    // Fallback check to ensure the count is correct, though the prompt should handle it.
    if (output.mcqs.length !== totalQuestions) {
        console.warn(`AI generated ${output.mcqs.length} questions instead of the requested ${totalQuestions}. The output may be truncated or incorrect.`);
        // Optionally, we could throw an error here to be stricter.
        // throw new Error(`AI generation failed to adhere to question count. Expected ${totalQuestions}, got ${output.mcqs.length}.`);
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


    return { mcqs: output.mcqs };
  }
);
