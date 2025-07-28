
'use server';

/**
 * @fileOverview Generates a live mock test by fetching a specific question paper and verifying its answers.
 *
 * - generateLiveMockTest - A function that handles the live mock test generation process.
 * - GenerateLiveMockTestInput - The input type for the function.
 * - GenerateLiveMockTestOutput - The return type for the function.
 */

import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { MCQ } from '@/lib/types';
import { getLiveTestQuestionPaper, getTopics, getReasoningQuestionsForLiveTest } from '@/lib/firestore';

const GenerateLiveMockTestInputSchema = z.object({
  liveTestId: z.string().describe('The ID of the live test paper document in Firestore.'),
  examCategory: z.enum(["MTS", "POSTMAN", "PA"]).describe('The exam category for which the test is being generated.'),
});
export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available from verification.'),
});

const GenerateLiveMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateLiveMockTestOutput = z.infer<typeof GenerateLiveMockTestOutputSchema>;

const verifyAndFormatQuestionPaperPrompt = ai.definePrompt({
    name: 'verifyAndFormatLiveTestPaperPrompt',
    input: {
        schema: z.object({
            questionPaperContent: z.string(),
            studyMaterial: z.string(),
            questionCount: z.number(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Verifier for the Indian Postal Department exams.

Your task is to process the entire 'QUESTION PAPER' provided below, verify each question against the 'STUDY MATERIAL', and output a clean, verified list of questions in JSON format.

**Process:**

1.  **Read and Parse:** Go through the entire 'QUESTION PAPER' text and identify all the multiple-choice questions. For each question, you MUST extract the full text of the question and the **full text for all four of its options**.
2.  **Verify & Correct:**
    *   For each question found, you MUST use the 'STUDY MATERIAL' as the single source of truth to verify the correct answer.
    *   If the answer in the question paper is correct, keep it.
    *   If the answer is INCORRECT, you MUST correct it based on the study material. The 'correctAnswer' field in the output must contain the full, correct option text.
    *   If a question is ambiguous, make a reasonable interpretation rather than skipping it.
3.  **Assign Topic:** For each verified question, identify its specific topic from the study material (e.g., "Profit and loss", "Methods of address") and specify it in the 'topic' field.

**Content Sources:**

--- STUDY MATERIAL (Primary Source of Truth) ---
{{{studyMaterial}}}
--- END STUDY MATERIAL ---

--- QUESTION PAPER ---
{{{questionPaperContent}}}
--- END QUESTION PAPER ---

**CRITICAL INSTRUCTIONS:**
*   Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
*   The 'options' array for each question MUST contain four strings, each being the complete text of an answer option.
*   Do NOT invent new questions. All questions must originate from the 'QUESTION PAPER'.
`,
});


export async function generateLiveMockTest(input: GenerateLiveMockTestInput): Promise<GenerateLiveMockTestOutput> {
  return generateLiveMockTestFlow(input);
}

const generateLiveMockTestFlow = ai.defineFlow(
  {
    name: 'generateLiveMockTestFlow',
    inputSchema: GenerateLiveMockTestInputSchema,
    outputSchema: GenerateLiveMockTestOutputSchema,
  },
  async input => {
    
    const [questionPaper, allTopics] = await Promise.all([
        getLiveTestQuestionPaper(input.liveTestId),
        getTopics()
    ]);
    
    if (!questionPaper) {
        throw new Error(`The live test question paper (${input.liveTestId}) could not be found. Please contact an administrator.`);
    }

    // Combine all study material from all topics into one string
    const allStudyMaterial = allTopics.map(t => `Topic: ${t.title}\nMaterial: ${t.material || 'N/A'}`).join('\n\n---\n\n');
    
    const questionCount = input.examCategory === 'PA' ? 80 : 50;

    const { output } = await verifyAndFormatQuestionPaperPrompt({
        questionPaperContent: questionPaper.content,
        studyMaterial: allStudyMaterial,
        questionCount: questionCount,
    });
    
    if (!output || !output.questions || output.questions.length === 0) {
        throw new Error(`The live test question paper '${questionPaper.fileName}' could not be processed. It might be empty, in an incorrect format, or the AI model is currently unavailable. Please try again later or contact an administrator.`);
    }

    let finalMCQs = output.questions;
    
    // For PA exam, fetch and append 20 reasoning questions
    if (input.examCategory === 'PA') {
        const reasoningQuestions = await getReasoningQuestionsForLiveTest(input.examCategory);
        if (reasoningQuestions.length < 20) {
            throw new Error(`Could not find enough reasoning questions for the PA live test. Found ${reasoningQuestions.length}, but need 20. Please upload more.`);
        }

        // Shuffle and pick 20 random questions
        const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);
        
        const formattedReasoningMCQs: MCQ[] = selectedReasoning.map(q => ({
            question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
            topic: 'Reasoning',
        }));
        
        finalMCQs = [...finalMCQs, ...formattedReasoningMCQs];
    }


    return { mcqs: finalMCQs };
  }
);
