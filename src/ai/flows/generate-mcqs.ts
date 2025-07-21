
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsInput - The input type for the generateMCQs function.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankByCategory, getUserTopicProgress, updateUserTopicProgress } from '@/lib/firestore';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  category: z.string().optional().describe('The parent category of the topic.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  difficulty: z.string().describe('The difficulty level of the questions (e.g., Easy, Moderate, Difficult).'),
  examCategory: z.string().optional().describe('The target exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.string().optional().describe('The part of the syllabus this topic belongs to (e.g., Part A, Part B).'),
  material: z.string().optional().describe('The study material for the topic, if available.'),
  previousQuestions: z.array(z.string()).optional().describe('A list of previously asked questions to avoid repetition.'),
  bankedQuestions: z.string().optional().describe('Content from previously uploaded exam questions to use as a reference.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  topicId: z.string().describe('The ID of the topic.'),
});
export type GenerateMCQsInput = z.infer<typeof GenerateMCQsInputSchema>;

const GenerateMCQsOutputSchema = z.object({
  mcqs: z.array(
    z.object({
      question: z.string().describe('The multiple-choice question.'),
      options: z.array(z.string()).describe('Four possible answers.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
      solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
    })
  ).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

const ArithmeticSolutionSchema = z.object({
    steps: z.array(z.string()).describe("An array of strings, where each string is a single step in the calculation using the LCM method."),
    final_answer: z.string().describe("A string containing only the final, mathematically exact answer."),
});

export async function generateMCQs(input: GenerateMCQsInput): Promise<GenerateMCQsOutput> {
  return generateMCQsFlow(input);
}

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

---
Here is a perfect example of the required output format.

Problem: "A can do a piece of work in 10 days and B can do it in 15 days. If they work together, in how many days will the work be completed?"

Expected JSON Output:
{
  "steps": [
    "Step 1: Define the total work using the LCM of the days. The LCM of 10 and 15 is 30. Let the total work be 30 units.",
    "Step 2: Calculate the individual daily work rates (efficiency). A's rate = 30 units / 10 days = 3 units/day. B's rate = 30 units / 15 days = 2 units/day.",
    "Step 3: Calculate the combined work rate when they work together. Combined rate = A's rate + B's rate = 3 units/day + 2 units/day = 5 units/day.",
    "Step 4: Calculate the total time required to complete the work together. Time = Total Work / Combined Rate = 30 units / 5 units/day = 6 days."
  ],
  "final_answer": "6 days"
}
---

Now, solve the following problem according to all the rules above:

Problem: "{{problem}}"`,
});


const prompt = ai.definePrompt({
  name: 'generateMCQsPrompt',
  input: {schema: GenerateMCQsInputSchema},
  output: {schema: GenerateMCQsOutputSchema},
  prompt: `You are an expert in generating multiple-choice questions (MCQs). Your goal is to create {{numberOfQuestions}} questions for the "{{examCategory}}" exam, specifically for "{{part}}". The questions should be on the topic of "{{topic}}" with a "{{difficulty}}" difficulty level. Each question must have four options and one correct answer.

CRITICAL INSTRUCTION: Do not start questions with phrases like "According to the...", "Based on the material...", or any similar introductory text. Questions should be direct.

--- PRIMARY RULE: SOURCE OF TRUTH ---
{{#if material}}
  Your PRIMARY source of truth is the 'MATERIAL' provided below. All questions MUST be based on it. Banked questions can be used for style/format reference ONLY, but if there's a conflict, the MATERIAL always wins.
  
  {{#ifEquals difficulty "Difficult"}}
    Generate statement-based questions and questions that test conceptual understanding based on the material. These questions should require deeper analysis rather than simple fact recall.
  {{else}}
    Generate direct questions based on the facts and information presented in the material.
  {{/ifEquals}}
---
--- MATERIAL START ---
{{{material}}}
--- MATERIAL END ---
{{else}}
--- GENERATION RULES (NO MATERIAL PROVIDED) ---
  {{#ifEquals category "Basic Arithmetics"}}
    You are a meticulous mathematics teacher. Your task is to create high-quality arithmetic problems.
    For each question, you MUST follow this process:
    1.  First, create a word problem and solve it yourself to arrive at a single, correct numerical answer.
    2.  The 'correctAnswer' field in your output MUST be this exact answer.
    3.  One of the four 'options' MUST be the correct answer.
    4.  The other three options must be plausible but incorrect distractors, derived from common calculation mistakes.
    5.  The 'solution' field MUST BE an empty string (""). The solution will be generated separately. DO NOT generate a solution here.
  {{else ifEquals topic "Current Affairs"}}
    For "Current Affairs", please refer to materials from reputable coaching centers like Suresh IAS Academy and SSA Adda to ensure the questions are relevant and of high quality. Focus on the period between January 2024 to June 2025. Use the 'REFERENCE QUESTIONS' below for style and format, if available.
  {{else}}
    For this topic, generate new questions. Use the 'REFERENCE QUESTIONS' below for style, format, and difficulty. Ensure the new questions are unique.
  {{/ifEquals}}
---
{{/if}}

--- REFERENCE & UNIQUENESS ---
{{#if bankedQuestions}}
  Use the following PREVIOUS YEARS' EXAM QUESTIONS as a reference for phrasing, style, format, and difficulty. Generate NEW questions inspired by these, but DO NOT copy them directly.
  ---REFERENCE QUESTIONS START---
  {{{bankedQuestions}}}
  ---REFERENCE QUESTIONS END---
{{/if}}

{{#if previousQuestions}}
  IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
  {{#each previousQuestions}}
  - "{{this}}"
  {{/each}}
{{/if}}
  `,
});

const MATERIAL_CHUNK_SIZE = 2000; // Process 2000 characters of material at a time

const generateMCQsFlow = ai.defineFlow(
  {
    name: 'generateMCQsFlow',
    inputSchema: GenerateMCQsInputSchema,
    outputSchema: GenerateMCQsOutputSchema,
  },
  async (input) => {
    if (!input.userId) {
      throw new Error("A user ID must be provided to generate a quiz.");
    }
    
    let flowInput = { ...input };

    // Fetch user's entire question history to avoid duplicates
    // This is now handled by the calling component (create-quiz-form)
    // const previousQuestions = await getAllUserQuestions(input.userId);
    // flowInput.previousQuestions = previousQuestions;
    
    // --- Material Progress Logic ---
    if (input.material && input.topicId) {
        const userProgress = await getUserTopicProgress(input.userId, input.topicId);
        const startIndex = userProgress?.lastCharacterIndexUsed || 0;
        
        let materialChunk = input.material.substring(startIndex, startIndex + MATERIAL_CHUNK_SIZE);
        
        let nextIndex = startIndex + materialChunk.length;

        // If we've reached the end of the material, reset for next time
        if (nextIndex >= input.material.length) {
            nextIndex = 0;
        }

        flowInput.material = materialChunk;

        // Defer the update until after the generation is successful
        const updateProgress = async () => {
             await updateUserTopicProgress(input.userId, input.topicId, nextIndex);
        }
        defer(updateProgress); // A simple defer utility
    }
    // --- End Material Progress Logic ---


    const excludedCategories = ["Basic Arithmetics", "General Awareness"];
    if (flowInput.category && excludedCategories.includes(flowInput.category)) {
      flowInput.material = undefined; 
    }

    if (input.examCategory) {
        const categoryForBank = input.examCategory === 'POSTMAN' ? 'MTS' : input.examCategory;
        const bankedQuestions = await getQuestionBankByCategory(categoryForBank as 'MTS' | 'POSTMAN' | 'PA');
        if (bankedQuestions) {
            flowInput.bankedQuestions = bankedQuestions;
        }
    }

    const {output: initialOutput} = await prompt(flowInput);
    if (!initialOutput || !initialOutput.mcqs || initialOutput.mcqs.length === 0) {
        throw new Error('The AI could not generate questions for the selected topic.');
    }
    
    // Execute deferred functions (like updating progress)
    await runDeferred();

    if (input.category === "Basic Arithmetics") {
        for (const mcq of initialOutput.mcqs) {
            try {
                const solutionResponse = await arithmeticSolverPrompt({ problem: mcq.question });
                const solution = solutionResponse.output;

                if (solution) {
                    mcq.solution = solution.steps.join('\n');
                }
            } catch (e) {
                console.error("Failed to generate a detailed solution for a question:", e);
                mcq.solution = "A detailed solution could not be generated for this problem.";
            }
        }
    }

    return initialOutput;
  }
);


// Helper for deferring execution
let deferredFunctions: (() => Promise<any>)[] = [];

function defer(fn: () => Promise<any>) {
    deferredFunctions.push(fn);
}

async function runDeferred() {
    await Promise.all(deferredFunctions.map(fn => fn()));
    deferredFunctions = []; // Reset for the next flow run
}
