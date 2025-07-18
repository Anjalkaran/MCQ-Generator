
'use server';

/**
 * @fileOverview Generates a mock test based on exam category using a single, robust prompt.
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


const generateMockTestPrompt = ai.definePrompt({
    name: 'generateMockTestPrompt',
    input: { schema: z.object({
        examCategory: z.string(),
        blueprint: z.any(),
        totalQuestions: z.number(),
    })},
    output: { schema: GenerateMockTestOutputSchema },
    prompt: `You are an expert in creating mock tests for the Indian Postal Department's {{examCategory}} exam.

--- MOST IMPORTANT RULE ---
Your final response MUST be a single, valid JSON object. The 'mcqs' array in this JSON object MUST contain EXACTLY {{totalQuestions}} questions. Do not generate more or fewer than this number.

--- EXAM BLUEPRINT ---
Generate the questions according to the following blueprint. Ensure the questions are distributed across the parts and topics as specified.

{{{json blueprint}}}

--- OUTPUT RULES ---
- For each generated question, you MUST assign its specific topic (e.g., "Percentage", "Delivery of mails") to the 'topic' field.
- For any arithmetic problems, the 'solution' field MUST be an empty string (""). The solution will be generated separately.
- Ensure each question has 4 options and one correct answer.
`,
});


export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

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

    const totalQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);

    const { output } = await generateMockTestPrompt({
        examCategory: input.examCategory,
        blueprint: blueprint,
        totalQuestions: totalQuestions,
    });
    
    if (!output || !output.mcqs) {
         throw new Error(`The AI could not generate any questions for the mock test.`);
    }
    
    // Check if the AI generated the correct number of questions.
    // If not, it's better to log it and continue than to fail the entire request for the user.
    if (output.mcqs.length !== totalQuestions) {
        console.warn(`AI did not generate the exact number of questions. Expected ${totalQuestions}, got ${output.mcqs.length}.`);
    }

    const partB = blueprint.parts.find(p => p.partName === 'Part-B');
    const arithmeticSection = partB?.sections.find(s => s.sectionName.includes('Arithmetic'));
    const arithmeticTopics = arithmeticSection?.topics || [];
    
    if (arithmeticTopics.length > 0) {
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
    }

    return { mcqs: output.mcqs };
  }
);
