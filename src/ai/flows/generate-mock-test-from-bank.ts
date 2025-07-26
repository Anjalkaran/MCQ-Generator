
'use server';

/**
 * @fileOverview Generates a mock test by selecting one question paper and extracting its questions.
 *
 * - generateMockTestFromBank - A function that handles the mock test generation process.
 * - GenerateMockTestFromBankInput - The input type for the function.
 * - GenerateMockTestFromBankOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getQuestionBankDocumentsByCategory } from '@/lib/firestore';

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.enum(["MTS", "POSTMAN", "PA"]).describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
});
export type GenerateMockTestFromBankInput = z.infer<typeof GenerateMockTestFromBankInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available.'),
});

const GenerateMockTestFromBankOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;

const extractMCQsFromBankPrompt = ai.definePrompt({
    name: 'extractMCQsFromBankPrompt',
    input: {
        schema: z.object({
            questionPaperContent: z.string(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Extractor for Indian Postal Department exam papers.

Your task is to meticulously parse the entire 'QUESTION PAPER' provided below and extract every multiple-choice question into a clean JSON format.

**Process:**

1.  **Read and Parse:** Go through the 'QUESTION PAPER' text and identify all multiple-choice questions. For each question, you MUST extract:
    *   The full text of the question.
    *   The full text for all four of its options.
    *   The correct answer as indicated in the text.
    *   The solution, if one is provided.
    *   The topic of the question (e.g., "Profit and loss", "Methods of address").
2.  **Format Correctly:** Ensure the extracted data fits the required JSON schema precisely.

**CRITICAL INSTRUCTIONS:**
*   Your final output MUST be a single, valid JSON object containing a 'questions' array.
*   The 'correctAnswer' field MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   Do NOT verify, correct, or change any of the content. Extract it exactly as it appears in the text.
*   The 'options' array for each question MUST contain four strings.

--- QUESTION PAPER ---
{{{questionPaperContent}}}
--- END QUESTION PAPER ---
`,
});


export async function generateMockTestFromBank(input: GenerateMockTestFromBankInput): Promise<GenerateMockTestFromBankOutput> {
  return generateMockTestFromBankFlow(input);
}

const generateMockTestFromBankFlow = ai.defineFlow(
  {
    name: 'generateMockTestFromBankFlow',
    inputSchema: GenerateMockTestFromBankInputSchema,
    outputSchema: GenerateMockTestFromBankOutputSchema,
  },
  async input => {
    
    const questionPapers = await getQuestionBankDocumentsByCategory(input.examCategory);
    
    if (!questionPapers || questionPapers.length === 0) {
        throw new Error(`No question papers found for exam category: ${input.examCategory}. Please upload some documents.`);
    }
    
    // Randomly select one question paper to process
    const selectedPaper = questionPapers[Math.floor(Math.random() * questionPapers.length)];

    const { output } = await extractMCQsFromBankPrompt({
        questionPaperContent: selectedPaper.content,
    });
    
    if (!output || !output.questions || output.questions.length === 0) {
        throw new Error(`Could not extract any questions from the selected paper: ${selectedPaper.fileName}. The document might be empty or in an unsupported format.`);
    }

    return { mcqs: output.questions };
  }
);
