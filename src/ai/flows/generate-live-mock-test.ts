
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
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
});
export type GenerateLiveMockTestInput = z.infer<typeof GenerateLiveMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).min(4, 'There must be four options.').max(4, 'There must be four options.').describe('Four possible answers, including the full text of each option.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().optional().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, if available from the source text.'),
});

const GenerateLiveMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateLiveMockTestOutput = z.infer<typeof GenerateLiveMockTestOutputSchema>;

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
    
    let parsedData: { questions: MCQ[] };
    try {
        parsedData = JSON.parse(questionPaper.content);
    } catch (error) {
        console.error("Failed to parse question paper content as JSON:", error);
        throw new Error(`The question paper '${questionPaper.fileName}' is not in a valid JSON format. Please upload it again.`);
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error(`The live test question paper '${questionPaper.fileName}' is empty or incorrectly formatted. It must be a JSON object with a "questions" array.`);
    }

    let finalMCQs = parsedData.questions;
    
    // For PA exam, fetch and append reasoning questions
    if (input.examCategory === 'PA') {
        const reasoningQuestions = await getReasoningQuestionsForLiveTest(input.examCategory);
        if (reasoningQuestions.length < 10) {
            throw new Error(`Could not find enough reasoning questions for the PA live test. Found ${reasoningQuestions.length}, but need 10. Please upload more.`);
        }

        // Shuffle and pick 10 random questions
        const selectedReasoning = reasoningQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        
        const formattedReasoningMCQs: MCQ[] = selectedReasoning.map(q => ({
            question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
            topic: 'Reasoning',
        }));
        
        finalMCQs = [...finalMCQs, ...formattedReasoningMCQs];
    }

    // If language is not English, translate the questions.
    if (input.language && input.language !== 'English') {
        const CHUNK_SIZE = 10; // Translate 10 questions at a time
        const MAX_RETRIES = 3;
        let translatedMCQs: MCQ[] = [];

        const translationPrompt = ai.definePrompt({
            name: 'translateLiveTestPrompt',
            model: 'googleai/gemini-1.5-flash',
            input: {
                schema: z.object({
                    questionsToTranslate: z.array(MCQSchema),
                    language: z.string(),
                })
            },
            output: { schema: GenerateLiveMockTestOutputSchema },
            prompt: `You are an expert translator specializing in technical content for Indian Postal Department exams.

Your task is to translate the provided array of multiple-choice questions (MCQs) found in the '--- JSON DATA TO TRANSLATE ---' section into the specified target language: {{language}}.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

- The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four translated strings in the 'options' array.
- Retain the original 'topic' field for each question.
- If a 'solution' is provided, translate it accurately.
- Your final output must be a single, valid JSON object that strictly adheres to the provided output schema.

--- JSON DATA TO TRANSLATE ---
{{{JSONstringify questionsToTranslate}}}
--- END JSON DATA TO TRANSLATE ---
`,
        });

        for (let i = 0; i < finalMCQs.length; i += CHUNK_SIZE) {
            const chunk = finalMCQs.slice(i, i + CHUNK_SIZE);
            let success = false;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const { output } = await translationPrompt({
                        questionsToTranslate: chunk,
                        language: input.language
                    });
                    
                    if (output && output.mcqs && output.mcqs.length === chunk.length) {
                        // Post-process the translated chunk to guarantee correctness.
                        const correctedMcqs = output.mcqs.map((translatedMcq, index) => {
                            const originalMcq = chunk[index];
                            
                            // 1. Find the index of the correct answer from the ORIGINAL options.
                            const correctAnswerIndex = originalMcq.options.indexOf(originalMcq.correctAnswer);

                            // 2. If the index is valid, set the translated correctAnswer to the option at that same index.
                            if (correctAnswerIndex !== -1 && translatedMcq.options[correctAnswerIndex]) {
                                translatedMcq.correctAnswer = translatedMcq.options[correctAnswerIndex];
                            } else {
                                // If something went wrong (e.g., index out of bounds), log it and fall back.
                                console.warn(`Could not find correct answer index for question: ${originalMcq.question}`);
                            }
                            return translatedMcq;
                        });

                        translatedMCQs.push(...correctedMcqs); // Push the corrected MCQs
                        success = true;
                        break; // Success, exit retry loop
                    }
                } catch (error) {
                    console.error(`Translation attempt ${attempt} for chunk starting at index ${i} failed:`, error);
                    if (attempt === MAX_RETRIES) {
                        throw new Error(`Failed to translate a batch of questions into ${input.language} after ${MAX_RETRIES} attempts.`);
                    }
                }
            }
            if (!success) {
                 throw new Error(`Failed to translate the live test questions into ${input.language}. An unrecoverable error occurred.`);
            }
        }
        
        finalMCQs = translatedMCQs;
    }


    return { mcqs: finalMCQs };
  }
);
