
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
    input: { schema: z.object({ textContent: z.string(), topicName: z.string(), language: z.string().optional().default('English') }) },
    output: { schema: z.object({ mcqs: z.array(MCQSchema) }) },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).
Your task is to extract **ALL** high-quality, unique questions you can find for the topic "{{topicName}}" from the 'TEXT CONTENT' provided below.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions relevant to the topic.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  For EACH extracted question, you MUST add a 'topic' field with the value "{{topicName}}".
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
            const topicConfigs = section.topics.map(t => typeof t === 'string' ? { name: t, questions: 0 } : t);
            
            // Distribute questions per topic if specified, otherwise pull from all topics in section
            let questionsPerTopic = Math.ceil(sectionQuestionsNeeded / topicConfigs.length);

            for (const topicConfig of topicConfigs) {
                const topicName = topicConfig.name;
                const questionsToFetch = topicConfig.questions > 0 ? topicConfig.questions : questionsPerTopic;
                
                const topicInfo = topicMapByName.get(topicName.toLowerCase());
                if (!topicInfo) {
                    console.warn(`Blueprint topic "${topicName}" not found in Firestore. Skipping.`);
                    continue;
                }

                const uploadedMCQs = await getTopicMCQs(topicInfo.id);
                if (!uploadedMCQs || uploadedMCQs.length === 0) {
                     throw new Error(`No questions uploaded for topic: "${topicName}". Please upload questions to the MCQ Bank for this topic.`);
                }
                
                const combinedContent = uploadedMCQs.map(doc => doc.content).join('\\n\\n---\\n\\n');
                
                const { output } = await extractMCQsFromTextPrompt({
                    textContent: combinedContent,
                    topicName: topicName,
                    language: input.language,
                });

                const allExtractedMcqs = output?.mcqs || [];
                if (allExtractedMcqs.length < questionsToFetch) {
                    throw new Error(`Could not find enough questions for topic "${topicName}". Found ${allExtractedMcqs.length}, but need ${questionsToFetch}. Please upload more to the MCQ Bank.`);
                }
                
                // Shuffle all extracted questions and take the required number
                const selectedMcqs = shuffleArray(allExtractedMcqs).slice(0, questionsToFetch);
                sectionQuestions.push(...selectedMcqs);
            }
        }
        
        allQuestions.push(...shuffleArray(sectionQuestions).slice(0, sectionQuestionsNeeded));
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allQuestions.length !== totalExpectedQuestions) { 
        console.warn(`Generated question count mismatch. Expected ${totalExpectedQuestions}, but got ${allQuestions.length}. Adjusting to expected count.`);
    }
    
    return { mcqs: shuffleArray(allQuestions).slice(0, totalExpectedQuestions) };
  }
);
