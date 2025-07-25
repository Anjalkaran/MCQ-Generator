
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankByCategory, getUserTopicProgress, updateUserTopicProgress, getTopicMCQs, getAllUserQuestions } from '@/lib/firestore';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  category: z.string().optional().describe('The parent category of the topic.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  difficulty: z.string().describe('The difficulty level of the questions (e.g., Easy, Moderate, Difficult).'),
  examCategory: z.string().optional().describe('The target exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.string().optional().describe('The part of the syllabus this topic belongs to (e.g., Part A, Part B).'),
  material: z.string().optional().describe('The study material for the topic, if available.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  topicId: z.string().describe('The ID of the topic.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
});
export type GenerateMCQsInput = z.infer<typeof GenerateMCQsInputSchema>;

const MCQSchema = z.object({
      question: z.string().describe('The multiple-choice question.'),
      options: z.array(z.string()).length(4).describe('An array of four possible answers.'),
      correctAnswer: z.string().describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
      solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
    });

const GenerateMCQsOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

// New schema for the 2-step arithmetic generation
const ArithmeticProblemSchema = z.object({
    question: z.string().describe("The word problem or numerical equation."),
});

const ArithmeticDistractorsSchema = z.object({
    distractors: z.array(z.string()).length(3).describe("An array of three plausible but incorrect numerical answers."),
});

const ArithmeticSolutionSchema = z.object({
    steps: z.array(z.string()).describe("An array of strings, where each string is a single step in the calculation using the LCM method for work problems, or BODMAS order for equations."),
    final_answer: z.string().describe("A string containing only the final, mathematically exact answer."),
});

const VerificationSchema = z.object({
    isCorrect: z.boolean().describe("Whether the provided answer is factually correct based ONLY on the study material."),
    justification: z.string().describe("A brief justification for the decision, citing the study material if the answer is correct, or explaining the error if it is incorrect."),
});


export async function generateMCQs(input: GenerateMCQsInput): Promise<GenerateMCQsOutput> {
  return generateMCQsFlow(input);
}

const arithmeticSolverPrompt = ai.definePrompt({
    name: 'arithmeticSolverPrompt',
    input: { schema: z.object({ problem: z.string(), language: z.string().optional().default('English') }) },
    output: { schema: ArithmeticSolutionSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are a precise mathematical solver AI. Your sole purpose is to solve the given word problem and provide a step-by-step solution and an exact final answer.

Your output MUST be a valid JSON object. Do not include any text, apologies, or explanations outside of the JSON structure itself.

The language of the solution steps and the final answer MUST be {{language}}.

The JSON object must have two keys:
1.  "steps": An array of strings. Each string must be a single, clear step in the calculation. For work-rate problems like this, use the LCM (Least Common Multiple) method. For BODMAS problems, show each operation in order.
2.  "final_answer": A string containing only the final, mathematically exact answer. Express it as a fraction or a decimal if necessary (e.g., "18.75 days" or "75/4 days" or "18").

CRITICAL INSTRUCTIONS:
-   Do NOT mention or analyze any multiple-choice options that might be in the problem description. Ignore them completely.
-   Do NOT guess or select the "closest" answer. Calculate and provide only the true mathematical result.
-   Do NOT use conversational language. Stick to formal, mathematical steps.

Now, solve the following problem according to all the rules above:

Problem: "{{problem}}"`,
});

// New prompt for generating just the problem
const arithmeticProblemPrompt = ai.definePrompt({
    name: 'arithmeticProblemPrompt',
    input: { schema: z.object({ topic: z.string(), previousQuestions: z.array(z.string()).optional(), language: z.string().optional().default('English'), numberOfQuestions: z.number() }) },
    output: { schema: z.object({ problems: z.array(ArithmeticProblemSchema) }) },
    prompt: `You are a meticulous mathematics teacher. Create {{numberOfQuestions}} unique word problems or numerical equations for the topic "{{topic}}".
    
The language of the problem MUST be {{language}}.

--- TOPIC-SPECIFIC INSTRUCTIONS ---
{{#ifEquals topic "Average"}}
You MUST create problems that involve calculating the average of a set of numbers.
Example: "Find the average of the following numbers: 10, 20, 30, 40, 50."
DO NOT create a number series or pattern-finding problem.
{{else ifEquals topic "BODMAS"}}
You MUST create numerical equations that require the BODMAS rule to solve.
Example: "Solve using BODMAS: 10 + 5 * 2 - (8 / 4) = ?"
{{else ifEquals topic "Time and work"}}
You MUST create word problems involving work rates and time.
Example: "A can complete a task in 10 days and B can do it in 15 days. If they work together, in how many days will the work be completed?"
{{else}}
Generate standard, relevant word problems for the topic "{{topic}}".
{{/ifEquals}}
--- END INSTRUCTIONS ---

IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
{{#if previousQuestions}}
    {{#each previousQuestions}}
    - "{{this}}"
    {{/each}}
{{/if}}

Your output MUST be a JSON object containing a "problems" array with EXACTLY {{numberOfQuestions}} entries.
Each entry must have a single key: "question".
The value should be the full word problem or equation.
Do not generate multiple-choice options or the answer here.
    `,
});

// New prompt for generating distractors
const arithmeticDistractorsPrompt = ai.definePrompt({
    name: 'arithmeticDistractorsPrompt',
    input: { schema: z.object({ question: z.string(), correctAnswer: z.string(), language: z.string().optional().default('English') }) },
    output: { schema: ArithmeticDistractorsSchema },
    prompt: `For the following math problem, the correct answer is "{{correctAnswer}}".
    
    Problem: "{{question}}"
    
    Your task is to generate three plausible but INCORRECT numerical answers that could be used as distractors in a multiple-choice question. The language of the distractors must be {{language}}. They should be common mistakes a student might make.
    
    Your output MUST be a valid JSON object with a single key "distractors", which is an array of three distinct strings.
    `,
});

const prompt = ai.definePrompt({
  name: 'generateMCQsPrompt',
  input: {schema: z.object({
      ...GenerateMCQsInputSchema.shape,
      previousQuestions: z.array(z.string()).optional(),
      bankedQuestions: z.string().optional(),
  })},
  output: {schema: GenerateMCQsOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert in generating multiple-choice questions (MCQs). Your goal is to create {{numberOfQuestions}} questions for the "{{examCategory}}" exam, specifically for "{{part}}". The questions should be on the topic of "{{topic}}" with a "{{difficulty}}" difficulty level.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**IMPORTANT RULE FOR TAMIL/HINDI:** When translating to Tamil or Hindi, you MUST keep all technical postal terms, scheme names, and abbreviations (e.g., "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office") in English.

--- MOST IMPORTANT RULE ---
For every question you generate, you MUST follow this two-step process:
1.  First, generate an array of four distinct strings for the 'options' field.
2.  Second, from that exact array, select the single correct option and use its full text for the 'correctAnswer' field. The 'correctAnswer' string must be an EXACT, case-sensitive match to one of the four strings in the 'options' array.

You MUST generate questions that can be answered with one of the four options. Do NOT create open-ended questions that ask to "Explain...", "Describe...", "What is...", or "List...".

CRITICAL INSTRUCTION: Do not start questions or explanations with phrases like "According to the...", "Based on the material...", "The provided material states that...", or any similar introductory text. Questions and explanations should be direct. Furthermore, do not generate questions that are logically flawed, whose correct answer is debatable, or where the correct answer is not present in the options. For example, a question like "What essential information is missing if a letter is returned to the sender?" is ambiguous. A better question would be "What is the most likely reason a letter cannot be delivered to the recipient, causing it to be returned to the sender?". Ensure your questions are clear and have one single, undisputed correct answer based on the provided material or general postal knowledge.

SPECIAL INSTRUCTION FOR POSTAL TERMS: When generating questions about mail offices, you MUST adhere to these definitions: A 'Sorting Mail Office' opens and sorts mail bags. A 'Transit Mail Office' only receives and dispatches closed bags without sorting them.

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

const verificationPrompt = ai.definePrompt({
    name: 'verificationPrompt',
    input: { schema: z.object({ material: z.string(), question: z.string(), answer: z.string() }) },
    output: { schema: VerificationSchema },
    prompt: `You are a meticulous Fact-Checker AI. Your only task is to verify if the 'PROPOSED ANSWER' to the 'QUESTION' is factually correct and explicitly supported by the 'STUDY MATERIAL' provided.

Your analysis must adhere to these rules:
1.  **Single Source of Truth:** Your decision MUST be based exclusively on the 'STUDY MATERIAL'. Do not use any external knowledge.
2.  **Explicit Support:** The answer is only correct if the information is clearly and directly stated in the material. Do not make inferences or assumptions.
3.  **Direct Match:** The answer must be a direct factual match. For numerical values (like weights, times, fees), the number must match exactly.

--- STUDY MATERIAL ---
{{{material}}}
--- END STUDY MATERIAL ---

--- QUESTION ---
"{{{question}}}"

--- PROPOSED ANSWER ---
"{{{answer}}}"

Now, based *only* on the study material, is the proposed answer correct? Provide your response in the required JSON format.
`,
});

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextPrompt',
    input: { schema: z.object({ textContent: z.string(), numberOfQuestions: z.number() }) },
    output: { schema: GenerateMCQsOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).

Your task is to extract exactly {{numberOfQuestions}} unique questions from the 'TEXT CONTENT' provided below.

**Process:**
1.  Read the 'TEXT CONTENT' and identify distinct multiple-choice questions.
2.  For each question, accurately extract the full question text, all four of its options, and the indicated correct answer.
3.  Randomly select {{numberOfQuestions}} of these extracted questions to include in your output.

**CRITICAL RULE:** The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.

--- TEXT CONTENT ---
{{{textContent}}}
--- END TEXT CONTENT ---

Your final output must be a single, valid JSON object containing an 'mcqs' array with exactly {{numberOfQuestions}} questions. Do not add a 'solution' field.
`
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
    
    const previousQuestions = await getAllUserQuestions(input.userId);

    let flowInput = { 
        ...input,
        previousQuestions: previousQuestions,
        bankedQuestions: undefined as string | undefined
    };

    const excludedCategories = ["Basic Arithmetics", "General Awareness"];
    if (flowInput.category && excludedCategories.includes(flowInput.category)) {
      flowInput.material = undefined; 
    }

    // --- MATERIAL HANDLING: Use the FULL material for generation, not just a chunk ---
    // The chunking logic is for tracking reading progress, not for limiting the AI's source material.
    // We will keep the 'defer' part to update progress, but use the full material for generation.
    const fullMaterial = flowInput.material; // Keep a copy of the full material
    if (flowInput.material && input.topicId) {
        const userProgress = await getUserTopicProgress(input.userId, input.topicId);
        const startIndex = userProgress?.lastCharacterIndexUsed || 0;
        let materialChunk = flowInput.material.substring(startIndex, startIndex + MATERIAL_CHUNK_SIZE);
        let nextIndex = startIndex + materialChunk.length;
        if (nextIndex >= flowInput.material.length) {
            nextIndex = 0;
        }
        // Don't overwrite the main material, just defer the progress update
        defer(async () => {
             await updateUserTopicProgress(input.userId, input.topicId, nextIndex);
        });
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
        let generatedMCQs = [];
        const existingQuestions = new Set(previousQuestions);
        let attempts = 0;

        while (generatedMCQs.length < input.numberOfQuestions) {
            attempts++;
            if (attempts > 10) { 
                console.error(`Breaking arithmetic generation loop after 10 attempts. Could only generate ${generatedMCQs.length} questions.`);
                break;
            }
            try {
                // Step 1: Generate just the problem statement(s)
                const problemsToGenerate = input.numberOfQuestions - generatedMCQs.length;
                const problemResponse = await arithmeticProblemPrompt({ 
                    topic: input.topic, 
                    previousQuestions: Array.from(existingQuestions),
                    language: input.language,
                    numberOfQuestions: problemsToGenerate,
                });
                
                if (!problemResponse.output?.problems || problemResponse.output.problems.length === 0) continue;

                for (const problem of problemResponse.output.problems) {
                    const { question } = problem;
                    if (existingQuestions.has(question)) continue;
                    

                    // Step 2: Get the VERIFIED correct answer and solution from the solver
                    const solutionResponse = await arithmeticSolverPrompt({ problem: question, language: input.language });
                    if (!solutionResponse.output?.final_answer) {
                        console.error("Solver failed to produce an answer for:", question);
                        continue;
                    }
                    const correctAnswer = solutionResponse.output.final_answer;
                    const solutionText = solutionResponse.output.steps.join('\n');
                    
                    // Step 3: Generate distractors based on the VERIFIED correct answer
                    const distractorsResponse = await arithmeticDistractorsPrompt({ question, correctAnswer, language: input.language });
                    if (!distractorsResponse.output?.distractors) continue;
                    const { distractors } = distractorsResponse.output;

                    // Step 4: Combine and shuffle options
                    const options = shuffleArray([correctAnswer, ...distractors]);
                    
                    if (!existingQuestions.has(question) && generatedMCQs.length < input.numberOfQuestions) {
                        generatedMCQs.push({
                            question,
                            options,
                            correctAnswer,
                            solution: solutionText,
                        });
                        existingQuestions.add(question); // Add to avoid duplicates in the same run
                    }
                }

            } catch (e) {
                console.error(`Attempt ${attempts}: Error during arithmetic question generation step:`, e);
            }
        }
        
        await runDeferred();
        if (generatedMCQs.length === 0 && input.numberOfQuestions > 0) {
            throw new Error('The AI could not generate any arithmetic questions after multiple attempts.');
        }
        
        if (generatedMCQs.length < input.numberOfQuestions) {
            console.warn(`Warning: Could only generate ${generatedMCQs.length} out of ${input.numberOfQuestions} requested arithmetic questions.`);
        }
        return { mcqs: generatedMCQs.slice(0, input.numberOfQuestions) };
    }
    // --- End Special Handling ---

    // --- HYBRID LOGIC: Check for uploaded MCQs first ---
    const uploadedMCQs = await getTopicMCQs(input.topicId);
    if (uploadedMCQs && uploadedMCQs.length > 0) {
        // Combine content from all documents for the topic
        const combinedContent = uploadedMCQs.map(doc => doc.content).join('\n\n---\n\n');
        
        const { output: extractedOutput } = await extractMCQsFromTextPrompt({
            textContent: combinedContent,
            numberOfQuestions: input.numberOfQuestions
        });
        
        if (extractedOutput && extractedOutput.mcqs && extractedOutput.mcqs.length > 0) {
            // Now, verify each extracted question against the material
            if (flowInput.material) {
                const verificationPromises = extractedOutput.mcqs.map(async (mcq) => {
                    try {
                        const verificationResponse = await verificationPrompt({
                            material: flowInput.material!,
                            question: mcq.question,
                            answer: mcq.correctAnswer,
                        });
                        if (verificationResponse.output?.isCorrect) {
                            return { ...mcq, solution: verificationResponse.output.justification }; // Use justification as solution
                        } else {
                            console.warn(`Filtering out incorrect MCQ from uploaded doc. Q: "${mcq.question}", A: "${mcq.correctAnswer}". Justification: ${verificationResponse.output?.justification}`);
                            return null;
                        }
                    } catch (e) {
                        console.error("Error during uploaded MCQ verification:", e);
                        return null;
                    }
                });
                const verifiedMCQs = (await Promise.all(verificationPromises)).filter(mcq => mcq !== null);
                if (verifiedMCQs.length > 0) {
                     await runDeferred();
                     return { mcqs: verifiedMCQs as any[] };
                }
            } else {
                 // If no material to verify against, just return the extracted MCQs
                 await runDeferred();
                 return { mcqs: extractedOutput.mcqs };
            }
        }
        // If extraction fails, fall through to generation
    }
    // --- END HYBRID LOGIC ---

    // --- START: NEW PARALLEL BATCH GENERATION LOGIC ---
    console.log(`Starting parallel batch generation for ${input.numberOfQuestions} questions.`);

    const questionsToAvoid = new Set(previousQuestions);
    const BATCH_SIZE = 10; // Ask for 10 questions at a time. A good balance.
    const NUM_BATCHES = Math.ceil(input.numberOfQuestions / BATCH_SIZE) + 2; // +2 for extra attempts

    const generationPromises = [];

    for (let i = 0; i < NUM_BATCHES; i++) {
        const promise = prompt({
            ...flowInput,
            material: fullMaterial, // CRITICAL: Use the FULL material every time
            numberOfQuestions: BATCH_SIZE,
            previousQuestions: [], // Let the final filter handle uniqueness
        }).catch(err => {
            console.error(`Batch ${i+1} failed to generate:`, err);
            return null; // Don't let one failed promise crash the whole process
        });
        generationPromises.push(promise);
    }

    const allResults = await Promise.all(generationPromises);

    let allGeneratedMCQs: (typeof MCQSchema._type)[] = [];
    allResults.forEach(result => {
        if (result && result.output && result.output.mcqs) {
            allGeneratedMCQs.push(...result.output.mcqs);
        }
    });

    console.log(`Generated a raw total of ${allGeneratedMCQs.length} questions across ${NUM_BATCHES} batches.`);

    // Now, filter this large pool of questions
    let finalMCQs: (typeof MCQSchema._type)[] = [];

    // 1. Filter for schema validity and uniqueness
    const uniqueValidMCQs: (typeof MCQSchema._type)[] = [];
    const tempQuestionSet = new Set<string>();

    for (const mcq of allGeneratedMCQs) {
        if (MCQSchema.safeParse(mcq).success && !questionsToAvoid.has(mcq.question) && !tempQuestionSet.has(mcq.question)) {
            uniqueValidMCQs.push(mcq);
            tempQuestionSet.add(mcq.question);
        }
    }
    
    console.log(`Filtered down to ${uniqueValidMCQs.length} unique and valid questions.`);

    // 2. Verify against material (if provided)
    if (fullMaterial && uniqueValidMCQs.length > 0) {
        const verificationPromises = uniqueValidMCQs.map(async (mcq) => {
            try {
                const verificationResponse = await verificationPrompt({
                    material: fullMaterial,
                    question: mcq.question,
                    answer: mcq.correctAnswer,
                });
                return verificationResponse.output?.isCorrect ? mcq : null;
            } catch (e) {
                console.error("Error during batch MCQ verification:", e);
                return null;
            }
        });

        const verifiedResults = await Promise.all(verificationPromises);
        finalMCQs = verifiedResults.filter(mcq => mcq !== null) as (typeof MCQSchema._type)[];
        console.log(`Verified down to ${finalMCQs.length} factually correct questions.`);
    } else {
        finalMCQs = uniqueValidMCQs;
    }

    // --- END: NEW PARALLEL BATCH GENERATION LOGIC ---

    if (finalMCQs.length === 0 && input.numberOfQuestions > 0) {
        throw new Error('The AI could not generate any valid questions. The source material might be too short or the topic too complex.');
    }
    
    if (finalMCQs.length < input.numberOfQuestions) {
        console.warn(`Warning: Could only generate ${finalMCQs.length} out of ${input.numberOfQuestions} requested valid questions.`);
    }

    await runDeferred();
    
    // Shuffle the final list and take the required number
    return { mcqs: shuffleArray(finalMCQs).slice(0, input.numberOfQuestions) };
  }
);

    
