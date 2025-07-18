
'use server';

/**
 * @fileOverview Generates a mock test based on exam category using an iterative approach.
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


const generateQuestionsForTopicPrompt = ai.definePrompt({
    name: 'generateQuestionsForTopicPrompt',
    input: { schema: z.object({
        examCategory: z.string(),
        sectionName: z.string(),
        topics: z.array(z.string()),
        numQuestions: z.number(),
    })},
    output: { schema: GenerateMockTestOutputSchema },
    prompt: `You are an expert in creating exam questions for the Indian Postal Department's {{examCategory}} exam.

Your task is to generate EXACTLY {{numQuestions}} multiple-choice questions for the section: "{{sectionName}}".

The questions must cover the following specific topics:
{{#each topics}}
- {{this}}
{{/each}}

CRITICAL INSTRUCTIONS:
- For each generated question, you MUST assign its topic to the 'topic' field. The topic must be one of the topics listed above.
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

    const allGeneratedMCQs: z.infer<typeof MCQSchema>[] = [];

    for (const part of blueprint.parts) {
        for (const section of part.sections) {
            let sectionMCQs: z.infer<typeof MCQSchema>[] = [];
            let attempts = 0;
            const maxAttempts = 5;

            while (sectionMCQs.length < section.questions && attempts < maxAttempts) {
                attempts++;
                const needed = section.questions - sectionMCQs.length;
                if (needed <= 0) break;
                
                try {
                    const { output } = await generateQuestionsForTopicPrompt({
                        examCategory: input.examCategory,
                        sectionName: section.sectionName,
                        topics: section.topics,
                        numQuestions: needed,
                    });

                    if (output && output.mcqs) {
                        sectionMCQs = [...sectionMCQs, ...output.mcqs];
                    }
                } catch (e) {
                    console.error(`Attempt ${attempts} failed for section "${section.sectionName}":`, e);
                }
            }
            
            allGeneratedMCQs.push(...sectionMCQs.slice(0, section.questions));
        }
    }

    if (allGeneratedMCQs.length === 0) {
         throw new Error(`The AI could not generate any questions for the mock test.`);
    }
    
    const partB = blueprint.parts.find(p => p.partName === 'Part-B');
    const arithmeticSection = partB?.sections.find(s => s.sectionName.includes('Arithmetic'));

    if (arithmeticSection) {
        for (const mcq of allGeneratedMCQs) {
            if (arithmeticSection.topics.includes(mcq.topic)) {
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


    return { mcqs: allGeneratedMCQs };
  }
);
