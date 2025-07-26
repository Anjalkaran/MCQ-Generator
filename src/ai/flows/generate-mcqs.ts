
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
      question: z.string().describe('The multiple-choice question text only. It must NOT contain the answer options.'),
      options: z.array(z.string()).length(4).describe('An array of four possible answers, with the full text for each option.'),
      correctAnswer: z.string().describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
      solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
      topic: z.string().optional().describe("The specific topic of the question."),
    });

const GenerateMCQsOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

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
1.  First, generate an array of four distinct strings for the 'options' field. Each string must contain the full text of the answer option.
2.  Second, from that exact array, select the single correct option and use its full text for the 'correctAnswer' field. The 'correctAnswer' string must be an EXACT, case-sensitive match to one of the four strings in the 'options' array.

You MUST generate questions that can be answered with one of the four options. Do NOT create open-ended questions that ask to "Explain...", "Describe...", "What is...", or "List...".

CRITICAL INSTRUCTION: Do not start questions or explanations with phrases like "According to the...", "Based on the material...", "The provided material states that...", or any similar introductory text. Questions and explanations should be direct. Furthermore, do not generate questions that are logically flawed, whose correct answer is debatable, or where the correct answer is not present in the options. For example, a question like "What is the essential information missing if a letter is returned to the sender?" is ambiguous. A better question would be "What is the most likely reason a letter cannot be delivered to the recipient, causing it to be returned to the sender?". Ensure your questions are clear and have one single, undisputed correct answer based on the provided material or general postal knowledge.

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

const VerificationSchema = z.object({
    isCorrect: z.boolean().describe("Whether the provided answer is factually correct based ONLY on the study material."),
    justification: z.string().describe("A brief justification for the decision, citing the study material if the answer is correct, or explaining the error if it is incorrect."),
});


const verificationPrompt = ai.definePrompt({
    name: 'verificationPrompt',
    input: { schema: z.object({ material: z.string(), question: z.string(), answer: z.string() }) },
    output: { schema: VerificationSchema },
    prompt: `You are a meticulous Fact-Checker AI. Your only task is to verify if the 'PROPOSED ANSWER' to the 'QUESTION' is factually correct and explicitly supported by the 'STUDY MATERIAL' provided.

Your analysis must adhere to these rules:
1.  **Single Source of Truth:** Your decision MUST be based exclusively on the 'STUDY MATERIAL'. Do not make inferences or assumptions.
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
    input: { schema: z.object({ textContent: z.string(), topicName: z.string(), numberOfQuestions: z.number(), language: z.string().optional().default('English') }) },
    output: { schema: GenerateMCQsOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).

Your task is to extract exactly {{numberOfQuestions}} unique questions from the 'TEXT CONTENT' provided below and format them according to the user's requested language.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**IMPORTANT RULE FOR TAMIL/HINDI:** When translating to Tamil or Hindi, you MUST keep all technical postal terms, scheme names, and abbreviations (e.g., "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office") in English.

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  **Translate** the entire extracted content for each question into the specified '{{language}}'.
4.  For EACH extracted question, you MUST add a 'topic' field with the value "{{topicName}}".
5.  If a solution is not found for a question, the 'solution' field MUST be an empty string ("").
6.  Randomly select {{numberOfQuestions}} of these extracted and translated questions to include in your output.

**CRITICAL RULE:** The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
**TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix from the option text before including it in the output. For example, "a. The quick brown fox" should become "The quick brown fox".

--- TEXT CONTENT ---
{{{textContent}}}
--- END TEXT CONTENT ---

Your final output must be a single, valid JSON object containing an 'mcqs' array with exactly {{numberOfQuestions}} questions. Each question object MUST include the 'topic' and 'solution' fields and be in the correct language.
`
});

const MATERIAL_CHUNK_SIZE = 2000; 
let deferredFunctions: (() => Promise<any>)[] = [];

function defer(fn: () => Promise<any>) {
    deferredFunctions.push(fn);
}

async function runDeferred() {
    await Promise.all(deferredFunctions.map(fn => fn()));
    deferredFunctions = []; 
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateMCQs(input: GenerateMCQsInput): Promise<GenerateMCQsOutput> {
  return generateMCQsFlow(input);
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
    
    const fullMaterial = flowInput.material;
    if (flowInput.material && input.topicId) {
        const userProgress = await getUserTopicProgress(input.userId, input.topicId);
        const startIndex = userProgress?.lastCharacterIndexUsed || 0;
        let materialChunk = flowInput.material.substring(startIndex, startIndex + MATERIAL_CHUNK_SIZE);
        let nextIndex = startIndex + materialChunk.length;
        if (nextIndex >= flowInput.material.length) {
            nextIndex = 0;
        }
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

    const uploadedMCQs = await getTopicMCQs(input.topicId);
    if (uploadedMCQs && uploadedMCQs.length > 0) {
        if (input.category === "Basic Arithmetics") {
            console.log("Basic Arithmetics category detected with uploaded document. Using document content directly.");
            const combinedContent = uploadedMCQs.map(doc => doc.content).join('\n\n---\n\n');
            const { output: extractedOutput } = await extractMCQsFromTextPrompt({
                textContent: combinedContent,
                topicName: input.topic,
                numberOfQuestions: input.numberOfQuestions,
                language: input.language,
            });

            if (extractedOutput && extractedOutput.mcqs && extractedOutput.mcqs.length > 0) {
                 await runDeferred();
                 return { mcqs: extractedOutput.mcqs };
            }
             console.warn("Could not extract MCQs from the Arithmetic document. Falling back to AI generation.");
        }
    }

    console.log(`Starting parallel batch generation for ${input.numberOfQuestions} questions.`);

    const questionsToAvoid = new Set(previousQuestions);
    const BATCH_SIZE = 10;
    const NUM_BATCHES = Math.ceil(input.numberOfQuestions / BATCH_SIZE) + 2;

    const generationPromises = [];

    for (let i = 0; i < NUM_BATCHES; i++) {
        const promise = prompt({
            ...flowInput,
            material: fullMaterial,
            numberOfQuestions: BATCH_SIZE,
            previousQuestions: [],
        }).catch(err => {
            console.error(`Batch ${i+1} failed to generate:`, err);
            return null;
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

    let finalMCQs: (typeof MCQSchema._type)[] = [];

    const uniqueValidMCQs: (typeof MCQSchema._type)[] = [];
    const tempQuestionSet = new Set<string>();

    for (const mcq of allGeneratedMCQs) {
        if (MCQSchema.safeParse(mcq).success && !questionsToAvoid.has(mcq.question) && !tempQuestionSet.has(mcq.question)) {
            uniqueValidMCQs.push({ ...mcq, topic: input.topic });
            tempQuestionSet.add(mcq.question);
        }
    }
    
    console.log(`Filtered down to ${uniqueValidMCQs.length} unique and valid questions.`);

    finalMCQs = uniqueValidMCQs;

    if (finalMCQs.length === 0 && input.numberOfQuestions > 0) {
        throw new Error('The AI could not generate any valid questions. The source material might be too short or the topic too complex.');
    }
    
    if (finalMCQs.length < input.numberOfQuestions) {
        console.warn(`Warning: Could only generate ${finalMCQs.length} out of ${input.numberOfQuestions} requested valid questions.`);
    }

    await runDeferred();
    
    return { mcqs: shuffleArray(finalMCQs).slice(0, input.numberOfQuestions) };
  }
);
