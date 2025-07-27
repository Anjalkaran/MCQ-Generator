
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getUserTopicProgress, updateUserTopicProgress, getTopicMCQs } from '@/lib/firestore';

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
      question: z.string().min(1, "Question text cannot be empty.").describe('The multiple-choice question text only. It must NOT contain the answer options.'),
      options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4).describe('An array of four possible answers, with the full text for each option.'),
      correctAnswer: z.string().min(1, "Correct answer cannot be empty.").describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
      solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
      topic: z.string().optional().describe("The specific topic of the question."),
    });

const GenerateMCQsOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated multiple-choice questions.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextPrompt',
    input: { schema: z.object({ textContent: z.string(), topicName: z.string(), numberOfQuestions: z.number(), language: z.string().optional().default('English') }) },
    output: { schema: GenerateMCQsOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).

Your task is to extract exactly {{numberOfQuestions}} unique questions from the 'TEXT CONTENT' provided below and format them according to the user's requested language.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  **Translate** the entire extracted content for each question into the specified '{{language}}'.
4.  For EACH extracted question, you MUST add a 'topic' field with the value "{{topicName}}".
5.  If a solution is not found for a question, the 'solution' field MUST be an empty string ("").
6.  Randomly select {{numberOfQuestions}} of these extracted and translated questions to include in your output.

**CRITICAL RULE:** The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
**TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix from the option text before including it in the output. For example, "a. The quick brown fox" should become "The quick brown fox".
**CRITICAL CONTENT RULE:** You MUST extract the actual text content for all fields. NEVER output the literal word "string" as a value for any field.

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

    // Defer user progress update to the end of the flow
    const updateUserProgress = async (contentSource: string) => {
        const userProgress = await getUserTopicProgress(input.userId, input.topicId);
        const startIndex = userProgress?.lastCharacterIndexUsed || 0;
        const endIndex = startIndex + MATERIAL_CHUNK_SIZE;
        let nextIndex = endIndex;
        
        if (endIndex >= contentSource.length) {
            nextIndex = 0; // Reset to the beginning if we've reached the end
        }
        
        defer(async () => {
             await updateUserTopicProgress(input.userId, input.topicId, nextIndex);
        });
        
        return contentSource.substring(startIndex, endIndex);
    };

    const uploadedMCQs = await getTopicMCQs(input.topicId);

    if (!uploadedMCQs || uploadedMCQs.length === 0) {
        throw new Error(`No MCQ document has been uploaded for the topic "${input.topic}". Please upload a document in the admin panel.`);
    }

    const combinedContent = uploadedMCQs.map(doc => doc.content).join('\n\n---\n\n');
    const contentChunk = await updateUserProgress(combinedContent);

    const { output: extractedOutput } = await extractMCQsFromTextPrompt({
        textContent: contentChunk,
        topicName: input.topic,
        numberOfQuestions: input.numberOfQuestions,
        language: input.language,
    });

    if (!extractedOutput || !extractedOutput.mcqs || extractedOutput.mcqs.length === 0) {
        throw new Error(`Could not extract any valid questions from the uploaded document for "${input.topic}". Please check the document format.`);
    }
    
    // **CRITICAL FIX**: Filter out any questions where the AI mistakenly returned "string" as content.
    const validMcqs = extractedOutput.mcqs.filter(mcq => {
        const questionText = mcq.question.trim().toLowerCase();
        const hasValidQuestion = questionText !== "string" && questionText.length > 1;
        const hasValidOptions = mcq.options.every(opt => opt.trim().toLowerCase() !== "string" && opt.trim().length > 0);
        return hasValidQuestion && hasValidOptions;
    });
    
    if (validMcqs.length === 0) {
        throw new Error(`Failed to extract valid questions from the document for "${input.topic}". The document may contain formatting issues.`);
    }
    
    await runDeferred();
    return { mcqs: shuffleArray(validMcqs) };
  }
);
