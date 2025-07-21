
'use server';

/**
 * @fileOverview Generates a mock test by extracting questions from a provided question bank.
 *
 * - generateMockTestFromBank - A function that handles the mock test generation process.
 * - GenerateMockTestFromBankInput - The input type for the function.
 * - GenerateMockTestFromBankOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ } from '@/lib/types';
import { getQuestionBankByCategory, getTopics } from '@/lib/firestore';

const GenerateMockTestFromBankInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
});
export type GenerateMockTestFromBankInput = z.infer<typeof GenerateMockTestFromBankInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available in the source or from verification.'),
});

const GenerateMockTestFromBankOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;


const extractQuestionsForPartPrompt = ai.definePrompt({
    name: 'extractQuestionsForPartPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            partName: z.string(),
            questionCount: z.number(),
            questionBank: z.string(),
            studyMaterial: z.string(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Curator for the Indian Postal Department's {{examCategory}} exam.

Your task is to create a set of EXACTLY **{{questionCount}}** questions for **{{partName}}**.

**Process:**

1.  **Extract:** Find questions from the 'QUESTION BANK' that are relevant to **{{partName}}** of the {{examCategory}} exam syllabus.
2.  **Verify & Correct:**
    *   For each extracted question, you MUST verify its answer using the 'STUDY MATERIAL' as the primary source of truth.
    *   If the answer in the question bank is correct according to the study material, keep it.
    *   If the answer is INCORRECT, you MUST correct it based on the study material.
    *   Provide a brief explanation for the correction in the 'solution' field.
    *   If you cannot verify or correct an answer, SKIP the question and find another one.
3.  **Assign Topic:** For each final question, you MUST identify its specific topic (e.g., "Profit and loss", "Methods of address") and specify it in the 'topic' field.

**Content Sources:**

--- STUDY MATERIAL (Primary Source of Truth) ---
{{{studyMaterial}}}
--- END STUDY MATERIAL ---

--- QUESTION BANK (Source of Questions) ---
{{{questionBank}}}
--- END QUESTION BANK ---

**CRITICAL INSTRUCTIONS:**
*   Your final output MUST be a single, valid JSON object containing a 'questions' array.
*   The 'questions' array MUST contain EXACTLY {{questionCount}} verified and corrected questions.
*   Do NOT invent new questions. All questions must originate from the 'QUESTION BANK'.
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
    let blueprint;
    let bankCategory;

    if (input.examCategory === 'MTS') {
        blueprint = MTS_BLUEPRINT;
        bankCategory = 'MTS';
    } else if (input.examCategory === 'POSTMAN') {
        blueprint = POSTMAN_BLUEPRINT;
        bankCategory = 'MTS'; // Postman uses MTS question bank
    } else if (input.examCategory === 'PA') {
        blueprint = PA_BLUEPRINT;
        bankCategory = 'PA';
    } else {
        throw new Error(`No blueprint found for exam category: ${input.examCategory}`);
    }

    const [questionBankContent, allTopics] = await Promise.all([
        getQuestionBankByCategory(bankCategory),
        getTopics()
    ]);

    if (!questionBankContent) {
        throw new Error(`No question bank found for exam category: ${bankCategory}. Please upload some documents.`);
    }

    // Combine all study material from all topics into one string
    const allStudyMaterial = allTopics.map(t => `Topic: ${t.title}\nMaterial: ${t.material || 'N/A'}`).join('\n\n---\n\n');
    
    const allGeneratedQuestions: MCQ[] = [];
    
    // Process each major part sequentially
    for (const part of blueprint.parts) {
      try {
          const { output } = await extractQuestionsForPartPrompt({
              examCategory: input.examCategory,
              partName: part.partName,
              questionCount: part.totalQuestions,
              questionBank: questionBankContent,
              studyMaterial: allStudyMaterial,
          });

          if (output && output.questions) {
              allGeneratedQuestions.push(...output.questions);
          } else {
               console.warn(`Could not generate questions for part: ${part.partName}`);
          }
      } catch(e) {
          console.error(`Error generating questions for part ${part.partName}`, e);
          // Continue to the next part even if one fails
      }
    }
    
    // Always return a valid object, even if empty
    return { mcqs: allGeneratedQuestions };
  }
);
