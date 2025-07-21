
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
  solution: z.string().optional().describe('A step-by-step solution, if available in the source.'),
});

const GenerateMockTestFromBankOutputSchema = z.object({
  mcqs: z.array(MCQSchema).describe('The generated mock test questions.'),
});
export type GenerateMockTestFromBankOutput = z.infer<typeof GenerateMockTestFromBankOutputSchema>;


const extractCandidateQuestionsPrompt = ai.definePrompt({
    name: 'extractCandidateQuestionsPrompt',
    input: {
        schema: z.object({
            examCategory: z.string(),
            sectionName: z.string(),
            topics: z.string(),
            questionCount: z.number(),
            questionBank: z.string(),
        })
    },
    output: {
        schema: z.object({
            questions: z.array(MCQSchema)
        })
    },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert Question Extractor for the Indian Postal Department's {{examCategory}} exam.

Your task is to extract EXACTLY **{{questionCount}}** questions for the section named **"{{sectionName}}"** from the provided 'QUESTION BANK'.

The questions you extract must be relevant to the following topics:
{{{topics}}}

- For each extracted question, you MUST identify its topic from the list above and specify it in the 'topic' field.
- If the question bank provides a solution or explanation, include it in the 'solution' field. Otherwise, leave it empty.
- Ensure the questions, options, and correct answers are extracted precisely as they appear in the source material.
- If the question bank doesn't have enough relevant questions for a section, do your best to find the closest matches. DO NOT invent new questions.

--- QUESTION BANK START ---
{{{questionBank}}}
--- QUESTION BANK END ---

Your final output MUST be a single, valid JSON object containing a 'questions' array with EXACTLY {{questionCount}} questions.
`,
});

const verifyQuestionAnswerPrompt = ai.definePrompt({
    name: 'verifyQuestionAnswerPrompt',
    input: {
        schema: z.object({
            question: z.string(),
            options: z.array(z.string()),
            proposedAnswer: z.string(),
            studyMaterial: z.string(),
        })
    },
    output: {
        schema: z.object({
            verificationStatus: z.enum(['Verified', 'Corrected', 'Unverifiable']),
            finalAnswer: z.string().optional(),
            explanation: z.string().optional(),
        })
    },
    prompt: `You are an expert Fact-Checker for Indian Postal Department exams. Your task is to verify the answer to a given multiple-choice question.

You will receive a question, its options, a proposed answer from an old question paper, and a comprehensive study material.

**Verification Process:**
1.  **Primary Source of Truth:** Your first and most important source is the provided 'STUDY MATERIAL'.
2.  **Check the Proposed Answer:** Compare the 'Proposed Answer' against the information in the 'STUDY MATERIAL'.
    - If the 'Proposed Answer' is correct according to the material, set 'verificationStatus' to "Verified".
    - If the 'Proposed Answer' is INCORRECT according to the material, find the correct answer from the material, set 'verificationStatus' to "Corrected", put the correct answer in 'finalAnswer', and provide a brief 'explanation'.
3.  **Use General Knowledge (if needed):** If the answer cannot be found in the 'STUDY MATERIAL', use your general knowledge to verify or correct the answer. Follow the same logic as step 2.
4.  **Mark as Unverifiable:** If you cannot confidently determine the correct answer from either the study material or your general knowledge, set 'verificationStatus' to "Unverifiable".

**Output Rules:**
- Your output must be a valid JSON object with the keys: \`verificationStatus\`, \`finalAnswer\` (optional), and \`explanation\` (optional).
- Do not invent information. If the material is inconclusive and you are unsure, it's better to mark it as "Unverifiable".

---

**Question:** {{question}}
**Options:** {{#each options}}- {{this}} {{/each}}
**Proposed Answer:** {{proposedAnswer}}

--- STUDY MATERIAL (Primary Source of Truth) ---
{{{studyMaterial}}}
--- END STUDY MATERIAL ---

Now, provide your verification result as a JSON object.
`,
})

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
    const allStudyMaterial = allTopics.map(t => t.material || '').join('\n\n');
    
    const allVerifiedQuestions: MCQ[] = [];
    
    for (const part of blueprint.parts) {
      for (const section of part.sections) {
        const topicsString = section.topics.map((topic: any) => `- ${(typeof topic === 'string') ? topic : topic.name}`).join('\n');
        
        // Fetch more candidates than needed to allow for skipping unverifiable ones
        const candidateCount = Math.ceil(section.questions * 1.5); 

        const { output: candidateOutput } = await extractCandidateQuestionsPrompt({
            examCategory: input.examCategory,
            sectionName: section.sectionName,
            topics: topicsString,
            questionCount: candidateCount,
            questionBank: questionBankContent,
        });
        
        const candidates = candidateOutput?.questions || [];
        const verifiedSectionQuestions: MCQ[] = [];

        for (const candidate of candidates) {
            if (verifiedSectionQuestions.length >= section.questions) {
                break; // We have enough questions for this section
            }

            const { output: verificationResult } = await verifyQuestionAnswerPrompt({
                question: candidate.question,
                options: candidate.options,
                proposedAnswer: candidate.correctAnswer,
                studyMaterial: allStudyMaterial,
            });

            if (verificationResult?.verificationStatus === 'Verified') {
                verifiedSectionQuestions.push(candidate);
            } else if (verificationResult?.verificationStatus === 'Corrected' && verificationResult.finalAnswer) {
                 verifiedSectionQuestions.push({
                    ...candidate,
                    correctAnswer: verificationResult.finalAnswer,
                    solution: verificationResult.explanation ? `${candidate.solution || ''}\nCorrection: ${verificationResult.explanation}`.trim() : candidate.solution,
                 });
            }
            // If 'Unverifiable', we skip the question.
        }
        allVerifiedQuestions.push(...verifiedSectionQuestions);
      }
    }

    const totalExpectedQuestions = blueprint.parts.reduce((sum, part) => sum + part.totalQuestions, 0);
    if (allVerifiedQuestions.length < totalExpectedQuestions) { 
        console.warn(`Could only verify ${allVerifiedQuestions.length} out of ${totalExpectedQuestions} expected questions. The test might be shorter than expected.`);
    }
    
    return { mcqs: allVerifiedQuestions };
  }
);
