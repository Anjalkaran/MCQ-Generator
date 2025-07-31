
'use server';

/**
 * @fileOverview Generates a mock test based on a detailed exam blueprint.
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
import type { MCQ, ReasoningQuestion } from '@/lib/types';
import { getAllUserQuestions, getTopicMCQs, getReasoningQuestionsForPartwiseTest } from '@/lib/firestore';

const GenerateMockTestInputSchema = z.object({
  examCategory: z.string().describe('The exam category (e.g., MTS, POSTMAN, PA).'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
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

const generateQuestionsForSectionPrompt = ai.definePrompt({
    name: 'generateQuestionsForSectionPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            sectionName: z.string(),
            topics: z.string(),
            questionCount: z.number(),
            previousQuestions: z.array(z.string()).optional().describe('A list of previously asked questions to avoid repetition.'),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert in creating mock test questions for the Indian Postal Department's {{examCategory}} exam.

Your task is to generate EXACTLY **{{questionCount}}** questions for the section named **"{{sectionName}}"**. The language for the entire output must be in English.

These questions must cover the following topics:
{{{topics}}}

For each generated question, you MUST specify its topic in the 'topic' field from the list above.
For any arithmetic questions, provide a detailed step-by-step explanation in the 'solution' field.

{{#if previousQuestions}}
  IMPORTANT: Do NOT repeat any of the following questions. Ensure the new questions are unique and different from this list:
  {{#each previousQuestions}}
  - "{{this}}"
  {{/each}}
{{/if}}

Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
`,
});

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextForMockTest',
    input: { schema: z.object({ textContent: z.string(), topicName: z.string(), numberOfQuestions: z.number() }) },
    output: { schema: z.object({ mcqs: z.array(MCQSchema) }) },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).
Your task is to extract up to {{numberOfQuestions}} high-quality, unique questions for the topic "{{topicName}}" from the 'TEXT CONTENT' provided below.

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions relevant to the topic.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  For EACH extracted question, you MUST add a 'topic' field with the value "{{topicName}}".

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

const CHUNK_SIZE = 10;

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
    
    const previousQuestions = await getAllUserQuestions(input.userId);
    const allQuestions: MCQ[] = [];

    for (const part of blueprint.parts) {
      for (const section of part.sections) {

        // Special handling for PA Reasoning section
        if (input.examCategory === 'PA' && section.sectionName === "Reasoning and Analytical Ability") {
            
            // 1. Handle Analytical Reasoning from MCQ Bank
            const analyticalTopic = section.topics.find(t => typeof t === 'object' && t.name === "Analytical Reasoning") as { name: string, questions: number, id: string } | undefined;
            if (analyticalTopic) {
                const uploadedMCQs = await getTopicMCQs(analyticalTopic.id);
                if (!uploadedMCQs || uploadedMCQs.length === 0) {
                    throw new Error(`Questions for "Analytical Reasoning" are not uploaded yet. Please upload them in the MCQ Bank.`);
                }
                const combinedContent = uploadedMCQs.map(doc => doc.content).join('\\n\\n---\\n\\n');
                const { output } = await extractMCQsFromTextPrompt({
                    textContent: combinedContent,
                    topicName: analyticalTopic.name,
                    numberOfQuestions: analyticalTopic.questions,
                });
                const extractedMcqs = output?.mcqs || [];
                if (extractedMcqs.length < analyticalTopic.questions) {
                    throw new Error(`Could not find enough questions for "Analytical Reasoning". Found ${extractedMcqs.length}, but need ${analyticalTopic.questions}. Please upload more.`);
                }
                allQuestions.push(...shuffleArray(extractedMcqs).slice(0, analyticalTopic.questions));
            }

            // 2. Handle other reasoning topics from Reasoning Bank
            const otherReasoningTopics = section.topics.filter(t => typeof t === 'object' && t.name !== "Analytical Reasoning") as { name: string, questions: number }[];
            const totalOtherReasoningQuestions = otherReasoningTopics.reduce((sum, t) => sum + t.questions, 0);

            if (totalOtherReasoningQuestions > 0) {
                const reasoningBankQuestions = await getReasoningQuestionsForPartwiseTest('PA');
                if (reasoningBankQuestions.length < totalOtherReasoningQuestions) {
                    throw new Error(`Not enough questions in the Reasoning Bank for PA exam. Found ${reasoningBankQuestions.length}, but need ${totalOtherReasoningQuestions}. Please upload more.`);
                }
                const selectedReasoning = shuffleArray(reasoningBankQuestions).slice(0, totalOtherReasoningQuestions);
                const formattedReasoningMCQs: MCQ[] = selectedReasoning.map((q: ReasoningQuestion) => ({
                    question: `${q.questionText} <img src="${q.questionImage}" alt="Question Image" class="mt-2 rounded-md max-h-60 mx-auto" />`,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    solution: q.solutionText || (q.solutionImage ? `<img src="${q.solutionImage}" alt="Solution Image" class="mt-2 rounded-md max-h-60 mx-auto" />` : undefined),
                    topic: q.topic,
                }));
                allQuestions.push(...formattedReasoningMCQs);
            }
            continue; // CRITICAL FIX: Skip the default AI generation for this section
        }


        // Default AI generation for all other sections
        const topicsString = section.topics.map((topic: any) => {
          const topicName = (typeof topic === 'string') ? topic : topic.name;
          return `- ${topicName}`;
        }).join('\\n');
        
        let questionsToGenerate = section.questions;
        
        while(questionsToGenerate > 0) {
            const currentChunkSize = Math.min(questionsToGenerate, CHUNK_SIZE);
            
            const { output } = await generateQuestionsForSectionPrompt({
                examCategory: input.examCategory,
                sectionName: section.sectionName,
                topics: topicsString,
                questionCount: currentChunkSize,
                previousQuestions: [...previousQuestions, ...allQuestions.map(q => q.question)],
            });

            if (output && output.questions) {
                allQuestions.push(...output.questions);
            }
            questionsToGenerate -= currentChunkSize;
        }
      }
    }
    
    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allQuestions.length !== totalExpectedQuestions) { 
        console.warn(`Generated question count mismatch. Expected ${totalExpectedQuestions}, but got ${allQuestions.length}.`);
    }
    
    return { mcqs: allQuestions };
  }
);

    
