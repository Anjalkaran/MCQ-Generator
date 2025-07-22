
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
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
      options: z.array(z.string()).length(4).describe('An array of four possible answers.'),
      correctAnswer: z.string().describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
      solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
    })
  ).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

// New schema for the 2-step arithmetic generation
const ArithmeticProblemSchema = z.object({
    question: z.string().describe("The word problem."),
    correctAnswer: z.string().describe("The single, mathematically correct answer."),
});

const ArithmeticDistractorsSchema = z.object({
    distractors: z.array(z.string()).length(3).describe("An array of three plausible but incorrect numerical answers."),
});

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

// New prompt for generating just the problem and answer
const arithmeticProblemPrompt = ai.definePrompt({
    name: 'arithmeticProblemPrompt',
    input: { schema: z.object({ topic: z.string(), previousQuestions: z.array(z.string()).optional() }) },
    output: { schema: z.object({ problems: z.array(ArithmeticProblemSchema) }) },
    prompt: `You are a meticulous mathematics teacher. Create a word problem for the topic "{{topic}}".
    
    IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
    {{#if previousQuestions}}
        {{#each previousQuestions}}
        - "{{this}}"
        {{/each}}
    {{/if}}

    Your output MUST be a JSON object containing a "problems" array with ONE entry.
    Each entry must have two keys:
    1. "question": The full word problem.
    2. "correctAnswer": The single, mathematically correct answer as a string.
    Do not generate multiple-choice options here.
    `,
});

// New prompt for generating distractors
const arithmeticDistractorsPrompt = ai.definePrompt({
    name: 'arithmeticDistractorsPrompt',
    input: { schema: z.object({ question: z.string(), correctAnswer: z.string() }) },
    output: { schema: ArithmeticDistractorsSchema },
    prompt: `For the following math problem, the correct answer is "{{correctAnswer}}".
    
    Problem: "{{question}}"
    
    Your task is to generate three plausible but INCORRECT numerical answers that could be used as distractors in a multiple-choice question. These should be based on common calculation mistakes.
    
    Your output MUST be a valid JSON object with a single key "distractors", which is an array of three distinct strings.
    `,
});

const prompt = ai.definePrompt({
  name: 'generateMCQsPrompt',
  input: {schema: GenerateMCQsInputSchema},
  output: {schema: GenerateMCQsOutputSchema},
  prompt: `You are an expert in generating multiple-choice questions (MCQs). Your goal is to create {{numberOfQuestions}} questions for the "{{examCategory}}" exam, specifically for "{{part}}". The questions should be on the topic of "{{topic}}" with a "{{difficulty}}" difficulty level.

--- MOST IMPORTANT RULE ---
For every question you generate, you MUST follow this two-step process:
1.  First, generate an array of four distinct strings for the 'options' field.
2.  Second, from that exact array, select the single correct option and use its full text for the 'correctAnswer' field. The 'correctAnswer' string must be an EXACT, case-sensitive match to one of the four strings in the 'options' array.

You MUST generate questions that can be answered with one of the four options. Do NOT create open-ended questions that ask to "Explain...", "Describe...", "What is...", or "List...".

CRITICAL INSTRUCTION: Do not start questions or explanations with phrases like "According to the...", "Based on the material...", "The provided material states that...", or any similar introductory text. Questions and explanations should be direct.

--- PRIMARY RULE: SOURCE OF TRUTH ---
{{#if material}}
  Your PRIMARY source of truth is the 'MATERIAL' provided below. All questions MUST be based on it. For each question, provide a detailed, step-by-step explanation in the 'solution' field based on the material, clarifying why the correct answer is right and why the others are wrong.
  
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
  {{#ifEquals topic "Current Affairs"}}
    For "Current Affairs", please refer to materials from reputable coaching centers like Suresh IAS Academy and SSA Adda to ensure the questions are relevant and of high quality. Focus on the period between January 2024 to June 2025. Use the 'REFERENCE QUESTIONS' below for style and format, if available. For each question, provide a detailed explanation for why the answer is correct in the 'solution' field.
  {{else}}
    For this topic, generate new questions. Use the 'REFERENCE QUESTIONS' below for style, format, and difficulty. Ensure the new questions are unique. For each question, provide a detailed explanation for the correct answer in the 'solution' field.
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

let deferredFunctions: (() => Promise<any>)[] = [];

function defer(fn: () => Promise<any>) {
    deferredFunctions.push(fn);
}

async function runDeferred() {
    await Promise.all(deferredFunctions.map(fn => fn()));
    deferredFunctions = []; // Reset for the next flow run
}

// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

    const excludedCategories = ["Basic Arithmetics", "General Awareness"];
    if (flowInput.category && excludedCategories.includes(flowInput.category)) {
      flowInput.material = undefined; 
    }

    if (flowInput.material && input.topicId) {
        const userProgress = await getUserTopicProgress(input.userId, input.topicId);
        const startIndex = userProgress?.lastCharacterIndexUsed || 0;
        let materialChunk = flowInput.material.substring(startIndex, startIndex + MATERIAL_CHUNK_SIZE);
        let nextIndex = startIndex + materialChunk.length;
        if (nextIndex >= flowInput.material.length) {
            nextIndex = 0;
        }
        flowInput.material = materialChunk;
        const updateProgress = async () => {
             await updateUserTopicProgress(input.userId, input.topicId, nextIndex);
        }
        defer(updateProgress); 
    }

    if (input.examCategory) {
        const categoryForBank = input.examCategory === 'POSTMAN' ? 'MTS' : input.examCategory;
        const bankedQuestions = await getQuestionBankByCategory(categoryForBank as 'MTS' | 'POSTMAN' | 'PA');
        if (bankedQuestions) {
            flowInput.bankedQuestions = bankedQuestions;
        }
    }

    // --- Special Handling for Basic Arithmetics ---
    if (input.category === "Basic Arithmetics") {
        const generatedMCQs = [];
        const existingQuestions = new Set(input.previousQuestions || []);

        for (let i = 0; i < input.numberOfQuestions; i++) {
            try {
                // Step 1: Generate the problem and correct answer
                const problemResponse = await arithmeticProblemPrompt({ 
                    topic: input.topic, 
                    previousQuestions: Array.from(existingQuestions) 
                });

                if (!problemResponse.output?.problems?.[0]) continue;
                const { question, correctAnswer } = problemResponse.output.problems[0];
                existingQuestions.add(question); // Add to avoid duplicates in the same run

                // Step 2: Generate distractors
                const distractorsResponse = await arithmeticDistractorsPrompt({ question, correctAnswer });
                if (!distractorsResponse.output?.distractors) continue;
                const { distractors } = distractorsResponse.output;

                // Step 3: Combine and shuffle options
                const options = shuffleArray([correctAnswer, ...distractors]);
                
                // Step 4: Generate the detailed solution
                let solutionText = "A detailed solution could not be generated for this problem.";
                try {
                     const solutionResponse = await arithmeticSolverPrompt({ problem: question });
                     if (solutionResponse.output) {
                        solutionText = solutionResponse.output.steps.join('\n');
                     }
                } catch (e) {
                    console.error("Failed to generate a detailed solution:", e);
                }

                generatedMCQs.push({
                    question,
                    options,
                    correctAnswer,
                    solution: solutionText,
                });

            } catch (e) {
                console.error("Error during arithmetic question generation step:", e);
            }
        }
        
        await runDeferred();
        return { mcqs: generatedMCQs };
    }
    // --- End Special Handling ---

    const {output: initialOutput} = await prompt(flowInput);
    if (!initialOutput || !initialOutput.mcqs || initialOutput.mcqs.length === 0) {
        throw new Error('The AI could not generate questions for the selected topic.');
    }
    
    await runDeferred();
    
    return initialOutput;
  }
);

    

    
