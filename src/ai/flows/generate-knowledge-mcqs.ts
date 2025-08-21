
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from general knowledge on a given topic.
 *
 * - generateKnowledgeMCQs - A function that handles the knowledge-based MCQ generation process.
 * - GenerateKnowledgeMCQsInput - The input type for the function.
 * - GenerateKnowledgeMCQsOutput - The return type for the function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const GenerateKnowledgeMCQsInputSchema = z.object({
  topicName: z.string().describe('The topic for which MCQs are generated.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
});
export type GenerateKnowledgeMCQsInput = z.infer<typeof GenerateKnowledgeMCQsInputSchema>;

const MCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty.").describe('The multiple-choice question text only. It must NOT contain the answer options.'),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4).describe('An array of four possible answers, with the full text for each option.'),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty.").describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
  solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
  topic: z.string().optional().describe("The specific topic of the question."),
});

const GenerateKnowledgeMCQsOutputSchema = z.object({
  quizId: z.string().describe('The ID of the generated quiz document in Firestore.'),
});
export type GenerateKnowledgeMCQsOutput = z.infer<typeof GenerateKnowledgeMCQsOutputSchema>;


export async function generateKnowledgeMCQs(
  input: GenerateKnowledgeMCQsInput
): Promise<GenerateKnowledgeMCQsOutput> {
  return generateKnowledgeMCQsFlow(input);
}


const generateKnowledgeMCQsPrompt = ai.definePrompt({
    name: 'generateKnowledgeMCQsPrompt',
    input: { schema: z.object({ topicName: z.string(), numberOfQuestions: z.number(), language: z.string().optional().default('English') }) },
    output: { schema: z.object({ mcqs: z.array(MCQSchema) }) },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert quiz generator for Indian competitive exams. Your task is to generate {{numberOfQuestions}} multiple-choice questions (MCQs) on the topic of "{{topicName}}".

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Instructions:**
1.  Create {{numberOfQuestions}} distinct and relevant questions.
2.  For each question, provide four plausible options.
3.  The 'correctAnswer' field MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
4.  Provide a brief but clear 'solution' or explanation for why the correct answer is right.
5.  For EACH generated question, you MUST add a 'topic' field with the value "{{topicName}}".

Your final output must be a single, valid JSON object containing an 'mcqs' array.
`
});


const generateKnowledgeMCQsFlow = ai.defineFlow(
  {
    name: 'generateKnowledgeMCQsFlow',
    inputSchema: GenerateKnowledgeMCQsInputSchema,
    outputSchema: GenerateKnowledgeMCQsOutputSchema,
  },
  async (input) => {
    const { output } = await generateKnowledgeMCQsPrompt({
        topicName: input.topicName,
        numberOfQuestions: input.numberOfQuestions,
        language: input.language,
    });

    if (!output || !output.mcqs || output.mcqs.length === 0) {
        throw new Error(`The AI failed to generate any questions for "${input.topicName}". Please try again.`);
    }
    
    const quizId = `gk-${input.topicName.replace(/\s+/g, '-')}-${Date.now()}`;
    const timeLimit = input.numberOfQuestions * 45;

    const quizData = {
      topic: {
        id: quizId,
        title: `${input.topicName} Quiz`,
        description: 'A custom generated quiz.',
        icon: 'globe',
        categoryId: 'general-knowledge',
      },
      mcqs: output.mcqs,
      timeLimit,
      language: input.language,
    };

    const db = getFirebaseDb();
    if (!db) {
      throw new Error("Firestore is not initialized.");
    }
    const docRef = await addDoc(collection(db, "generatedQuizzes"), quizData);
    
    return { quizId: docRef.id };
  }
);
