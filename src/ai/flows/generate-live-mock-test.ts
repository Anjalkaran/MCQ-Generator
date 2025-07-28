
'use server';

/**
 * @fileOverview Generates a live mock test by fetching a specific question paper and extracting its questions.
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
import { getLiveTestQuestionPaper, getReasoningQuestionsForLiveTest } from '@/lib/firestore';

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
  solution: z.string().optional().describe('A step-by-step solution, if available from the source text.'),
});

const GenerateLiveMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateLiveMockTestOutput = z.infer<typeof GenerateLiveMockTestOutputSchema>;

const extractAndFormatLiveTestPaperPrompt = ai.definePrompt({
    name: 'extractAndFormatLiveTestPaperPrompt',
    input: {
        schema: z.object({
            questionPaperContent: z.string(),
            questionCount: z.number(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Extractor for Indian Postal Department exam papers.

Your task is to meticulously parse the entire 'QUESTION PAPER' provided below and extract every multiple-choice question into a clean, valid JSON format.

**Process:**

1.  **Read and Parse:** Go through the 'QUESTION PAPER' text and identify all multiple-choice questions. For each question, you MUST extract:
    *   The full text of the question.
    *   The full text for all four of its options.
    *   The correct answer as indicated in the text.
    *   The solution, if one is provided.
    *   The topic of the question (e.g., "Profit and loss", "Methods of address").
2.  **Format Correctly:** Ensure the extracted data fits the required JSON schema precisely as shown in the example.
3.  **Verify Output:** Before finalizing, double-check that your entire output is a single, valid JSON object, starting with { and ending with }.

**CRITICAL INSTRUCTIONS:**
*   Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
*   Your response must ONLY contain the JSON object. Do not include any other text, explanations, or formatting like markdown backticks.
*   The 'correctAnswer' field MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   The 'options' array for each question MUST contain exactly four strings.
*   Do NOT verify, correct, or change any of the content. Extract it exactly as it appears in the text.
*   **TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix from the option text. For example, "a. The quick brown fox" should become "The quick brown fox".

--- JSON OUTPUT EXAMPLE ---
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctAnswer": "Paris",
      "topic": "Geography",
      "solution": "The capital of France is Paris, located on the river Seine."
    },
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": "4",
      "topic": "Mathematics",
      "solution": "Adding 2 and 2 results in 4."
    }
  ]
}
--- END JSON OUTPUT EXAMPLE ---

--- QUESTION PAPER ---
{{{questionPaperContent}}}
--- END QUESTION PAPER ---
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
    
    const questionPaper = await getLiveTestQuestionPaper(input.liveTestId);
    
    if (!questionPaper) {
        throw new Error(`The live test question paper (${input.liveTestId}) could not be found. Please contact an administrator.`);
    }
    
    const questionCount = input.examCategory === 'PA' ? 80 : 50;

    const { output } = await extractAndFormatLiveTestPaperPrompt({
        questionPaperContent: questionPaper.content,
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
