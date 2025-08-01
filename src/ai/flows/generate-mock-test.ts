
'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint using questions from the MCQ and Reasoning Banks.
 *
 * - generateMockTest - A function that handles the mock test generation process.
 * - GenerateMockTestInput - The input type for the generateMockTest function.
 * - GenerateMockTestOutput - The return type for the generateMockTest function.
 */

import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { MTS_BLUEPRINT, POSTMAN_BLUEPRINT, PA_BLUEPRINT } from '@/lib/exam-blueprints';
import type { MCQ, ReasoningQuestion, Topic } from '@/lib/types';
import { getTopicMCQs, getReasoningQuestionsForPartwiseTest, getTopics } from '@/lib/firestore';

const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz.'),
});
export type GenerateMockTestInput = z.infer<typeof GenerateMockTestInputSchema>;

const MCQSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('Four possible answers.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  topic: z.string().describe('The topic the question belongs to.'),
  solution: z.string().optional().describe('A step-by-step solution, especially for arithmetic problems.'),
});

const GenerateMockTestOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestOutput = z.infer<typeof GenerateMockTestOutputSchema>;

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextForMockTest',
    input: { schema: z.object({ textContent: z.string(), topicNames: z.array(z.string()), language: z.string().optional().default('English') }) },
    output: { schema: z.object({ mcqs: z.array(MCQSchema) }) },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).
Your task is to extract **ALL** high-quality, unique questions you can find for the topics listed below from the 'TEXT CONTENT' provided.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Topics to Extract:**
{{#each topicNames}}
- {{this}}
{{/each}}

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions relevant to the topics above.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  For EACH extracted question, you MUST add a 'topic' field with the specific topic name it belongs to.
4.  **Translate** the entire extracted content for each question into the specified '{{language}}'.

**CRITICAL INSTRUCTIONS:**
*   The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   **TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix.

--- TEXT CONTENT ---
{{{textContent}}}
--- END TEXT CONTENT ---
`
});

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateMockTest(input: GenerateMockTestInput): Promise<GenerateMockTestOutput> {
  return generateMockTestFlow(input);
}

const MATERIAL_CHUNK_SIZE = 8000; // Increased chunk size for better performance

const generateMockTestFlow = ai.defineFlow(
  {
    name: 'generateMockTestFlow',
    inputSchema: GenerateMockTestInputSchema,
    outputSchema: GenerateMockTestOutputSchema,
  },
  async input => {
    let blueprint;
    if (input.examCategory === 'MTS') blueprint = MTS_BLUEPRINT;
    else if (input.examCategory === 'POSTMAN') blueprint = POSTMAN_BLUEPRINT;
    else if (input.examCategory === 'PA') blueprint = PA_BLUEPRINT;
    else throw new Error(`No blueprint found for exam category: ${input.examCategory}`);

    const allQuestions: MCQ[] = [];
    const allFirestoreTopics = await getTopics();
    const topicMapByName: Map<string, Topic> = new Map(allFirestoreTopics.map(t => [t.title.toLowerCase(), t]));

    for (const part of blueprint.parts) {
      for (const section of part.sections) {

        let sectionQuestionsNeeded = section.questions;
        let sectionQuestions: MCQ[] = [];

        // Special handling for Reasoning sections - pull from Reasoning Bank
        if (section.sectionName.toLowerCase().includes("reasoning")) {
            const reasoningBankQuestions = await getReasoningQuestionsForPartwiseTest(input.examCategory as 'MTS' | 'POSTMAN' | 'PA');
            if (reasoningBankQuestions.length < sectionQuestionsNeeded) {
                throw new Error(`Not enough questions in the Reasoning Bank for ${section.sectionName}. Found ${reasoningBankQuestions.length}, but need ${sectionQuestionsNeeded}. Please upload more.`);
            }
            const selectedReasoning = shuffleArray(reasoningBankQuestions).slice(0, sectionQuestionsNeeded);
            const formattedReasoningMCQs: MCQ[] = selectedReasoning.map((q: ReasoningQuestion) => ({
                question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                options: q.options,
                correctAnswer: q.correctAnswer,
                solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                topic: q.topic,
            }));
            sectionQuestions.push(...formattedReasoningMCQs);
        } else {
            // Default handling for all other sections - pull from MCQ Bank
            const topicNamesInSection = section.topics.map(t => (typeof t === 'string' ? t : t.name));
            const topicIdsInSection: string[] = [];
            
            for (const topicName of topicNamesInSection) {
                const topicInfo = topicMapByName.get(topicName.toLowerCase());
                if (topicInfo) {
                    topicIdsInSection.push(topicInfo.id);
                } else {
                    console.warn(`Blueprint topic "${topicName}" not found in Firestore. Skipping.`);
                }
            }

            if (topicIdsInSection.length === 0) {
                throw new Error(`No topics found in Firestore for section: "${section.sectionName}". Please check blueprint and topic names.`);
            }

            const allMcqDocsForSection = await Promise.all(topicIdsInSection.map(id => getTopicMCQs(id)));
            const combinedContent = allMcqDocsForSection.flat().map(doc => doc.content).join('\n\n---\n\n');
            
            if (!combinedContent.trim()) {
                throw new Error(`No MCQ documents have been uploaded for the topics in section: "${section.sectionName}". Please upload question files.`);
            }

            let allExtractedMcqs: MCQ[] = [];
            const collectedQuestionTexts = new Set<string>();

            // Chunking logic to handle large documents
            for (let i = 0; i < combinedContent.length; i += MATERIAL_CHUNK_SIZE) {
                if (allExtractedMcqs.length >= sectionQuestionsNeeded * 1.5) break;

                const contentChunk = combinedContent.substring(i, i + MATERIAL_CHUNK_SIZE);

                try {
                    const { output } = await extractMCQsFromTextPrompt({
                        textContent: contentChunk,
                        topicNames: topicNamesInSection,
                        language: input.language,
                    });

                    // ROBUST CHECK: Ensure BOTH 'output' and 'output.mcqs' exist before trying to use them.
                    if (output && output.mcqs) {
                        for (const mcq of output.mcqs) {
                            const questionText = mcq.question.trim();
                            if (!collectedQuestionTexts.has(questionText)) {
                                allExtractedMcqs.push(mcq);
                                collectedQuestionTexts.add(questionText);
                            }
                        }
                    } else {
                        // Log a warning if the AI doesn't return the expected data.
                        console.warn('AI prompt did not return valid MCQs for a chunk. Output was:', output);
                    }
                } catch (error) {
                    console.error('An error occurred during the AI prompt call:', error);
                    // Continue to the next chunk
                }
            }

            if (allExtractedMcqs.length < sectionQuestionsNeeded) {
                throw new Error(`Could not find enough questions for section "${section.sectionName}". Found ${allExtractedMcqs.length}, but need ${sectionQuestionsNeeded}. Please upload more questions for the topics in this section.`);
            }

            // Shuffle all extracted questions and take the required number for the whole section
            const selectedMcqs = shuffleArray(allExtractedMcqs).slice(0, sectionQuestionsNeeded);
            sectionQuestions.push(...selectedMcqs);
        }
        
        allQuestions.push(...sectionQuestions);
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allQuestions.length !== totalExpectedQuestions) { 
        console.warn(`Generated question count mismatch. Expected ${totalExpectedQuestions}, but got ${allQuestions.length}. Adjusting to expected count.`);
    }
    
    return { mcqs: shuffleArray(allQuestions).slice(0, totalExpectedQuestions) };
  }
);
