
'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ } from '@/lib/types';

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
    input: {
        schema: z.object({
            examCategory: z.string(),
            totalQuestions: z.number(),
            partAQuestions: z.number(),
            partBQuestions: z.number(),
            partATopics: z.string(),
            partBTopics: z.string(),
        })
    },
    output: { schema: GenerateMockTestOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert in creating mock test questions for the Indian Postal Department's {{examCategory}} exam.

Your task is to generate a full mock test with a total of **{{totalQuestions}}** questions.

The test MUST be divided into two parts with the following structure:
1.  **Part-A**: Generate EXACTLY **{{partAQuestions}}** questions covering these topics:
{{{partATopics}}}

2.  **Part-B**: Generate EXACTLY **{{partBQuestions}}** questions covering these topics:
{{{partBTopics}}}


--- MOST IMPORTANT RULE ---
- Your final output MUST be a single, valid JSON object containing an 'mcqs' array with EXACTLY {{totalQuestions}} questions in total.
- For each generated question, you MUST specify its topic in the 'topic' field from the lists above.
- For any arithmetic questions, the 'solution' field MUST be an empty string ("").

Do not deviate from these counts. The total number of questions must be precise.`,
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

    const partA = blueprint.parts.find(p => p.partName === 'Part-A');
    const partB = blueprint.parts.find(p => p.partName === 'Part-B');

    if (!partA || !partB) {
        throw new Error('Blueprint is missing Part-A or Part-B.');
    }

    const partAQuestions = partA.totalQuestions;
    const partBQuestions = partB.totalQuestions;
    const totalQuestions = partAQuestions + partBQuestions;

    const getTopicsFromPart = (part: any) => {
        return part.sections.flatMap((section: any) => {
            if (!section.topics || !Array.isArray(section.topics)) {
                return []; 
            }
            return section.topics.map((topic: any) => {
                const topicName = (typeof topic === 'string') ? topic : topic.name;
                return `- ${topicName}`;
            });
        }).join('\n');
    };

    const partATopics = getTopicsFromPart(partA);
    const partBTopics = getTopicsFromPart(partB);

    const { output } = await generateMockTestPrompt({
        examCategory: input.examCategory,
        totalQuestions,
        partAQuestions,
        partBQuestions,
        partATopics,
        partBTopics,
    });

    if (!output || !output.mcqs || output.mcqs.length === 0) {
         throw new Error(`The AI could not generate a mock test. Please try again.`);
    }

    if (Math.abs(output.mcqs.length - totalQuestions) > 5) { // Allow a small tolerance
        throw new Error(`AI generation failed to adhere to question count. Expected around ${totalQuestions}, but got ${output.mcqs.length}. Please try again.`);
    }

    const arithmeticSection = blueprint.parts.flatMap(p => p.sections).find(s => s.sectionName.includes('Arithmetic'));
    if (arithmeticSection) {
        const arithmeticTopicNames = arithmeticSection.topics.map((t: any) => (typeof t === 'string' ? t : t.name));
        
        for (const mcq of output.mcqs) {
            if (mcq.topic && arithmeticTopicNames.includes(mcq.topic)) {
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
