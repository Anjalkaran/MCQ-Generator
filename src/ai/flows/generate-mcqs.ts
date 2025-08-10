
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */
import { config } from 'dotenv';
config();

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getTopicMCQs } from '@/lib/firestore';
import type { MCQ } from '@/lib/types';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const GenerateMCQsInputSchema = z.object({
  topic: z.string().describe('The topic for which MCQs are generated.'),
  category: z.string().optional().describe('The parent category of the topic.'),
  numberOfQuestions: z.number().describe('The number of MCQs to generate.'),
  examCategory: z.string().optional().describe('The target exam category (e.g., MTS, POSTMAN, PA).'),
  part: z.string().optional().describe('The part of the syllabus this topic belongs to (e.g., Part A, Part B).'),
  material: z.string().optional().describe('The study material for the topic, if available.'),
  userId: z.string().describe('The ID of the user requesting the quiz.'),
  topicId: z.string().describe('The ID of the topic.'),
  language: z.string().optional().default('English').describe('The language for the generated quiz (e.g., "English", "Tamil", "Hindi").'),
});
export type GenerateMCQsInput = z.infer<typeof GenerateMCQsInputSchema>;

const MCQSchema = z.object({
  question: z.string().min(1, "Question text cannot be empty.").describe('The multiple-choice question text only. It must NOT contain the answer options.'),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).length(4).describe('An array of four possible answers, with the full text for each option.'),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty.").describe('The full text of the correct answer, which MUST be an exact match to one of the four strings in the `options` array.'),
  solution: z.string().optional().describe('A step-by-step solution for arithmetic problems, or a detailed explanation for other topics.'),
  topic: z.string().optional().describe("The specific topic of the question."),
});

const GenerateMCQsOutputSchema = z.object({
  quizId: z.string().describe('The ID of the generated quiz document in Firestore.'),
});
export type GenerateMCQsOutput = z.infer<typeof GenerateMCQsOutputSchema>;

const extractMCQsFromTextPrompt = ai.definePrompt({
    name: 'extractMCQsFromTextPrompt',
    input: { schema: z.object({ textContent: z.string(), topicName: z.string(), numberOfQuestions: z.number(), language: z.string().optional().default('English') }) },
    output: { schema: z.object({ mcqs: z.array(MCQSchema) }) },
    model: 'googleai/gemini-1.5-pro',
    prompt: `You are an expert at parsing and formatting multiple-choice questions (MCQs).

Your task is to extract as many high-quality, unique questions as you can find from the 'TEXT CONTENT' provided below and format them according to the user's requested language.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Process:**
1.  Read the 'TEXT CONTENT' and identify all distinct multiple-choice questions.
2.  For each question, accurately extract the full question text, all four of its options, the indicated correct answer, and the step-by-step solution if provided.
3.  **Translate** the entire extracted content for each question into the specified '{{language}}'.
4.  For EACH extracted question, you MUST add a 'topic' field with the value "{{topicName}}".
5.  If a solution is not found for a question, the 'solution' field MUST be an empty string ("").

**CRITICAL INSTRUCTIONS:**
*   Do NOT verify, correct, or change any of the content. Extract it exactly as it appears in the text.
*   The 'correctAnswer' field in your output MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
*   **TRIMMING RULE:** If an option in the text starts with a letter followed by a period or parenthesis (e.g., "a.", "B)", "c."), you MUST trim this prefix from the option text before including it in the output. For example, "a. The quick brown fox" should become "The quick brown fox".
*   You MUST extract the actual text content for all fields. NEVER output the literal word "string" as a value for any field. Your goal is to extract up to {{numberOfQuestions}} questions if they are available in the text.

--- TEXT CONTENT ---
{{{textContent}}}
--- END TEXT CONTENT ---

Your final output must be a single, valid JSON object containing an 'mcqs' array with all the valid questions you were able to extract from the text.
`
});

const MATERIAL_CHUNK_SIZE = 8000;

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateMCQs(input: GenerateMCQsInput): Promise<GenerateMCQsOutput> {
  return generateMCQsFlow(input);
}

const languageMap: Record<string, string> = {
    'tamil': 'ta',
    'hindi': 'hi',
    'telugu': 'te',
    'kannada': 'kn'
};

const generateMCQsFlow = ai.defineFlow(
  {
    name: 'generateMCQsFlow',
    inputSchema: GenerateMCQsInputSchema,
    outputSchema: GenerateMCQsOutputSchema,
  },
  async (input) => {
    if (!input.userId) {
      throw new Error("A user ID must be provided to generate a quiz.");
    }
    
    let finalMCQs: MCQ[] = [];
    
    // **PRIORITY 1: Check for uploaded JSON files in the MCQ Bank**
    const uploadedMCQDocs = await getTopicMCQs(input.topicId);
    if (uploadedMCQDocs && uploadedMCQDocs.length > 0) {
        let canonicalQuestions: MCQ[] = [];
        uploadedMCQDocs.forEach(doc => {
            try {
                const parsedContent = JSON.parse(doc.content);
                if (parsedContent.mcqs && Array.isArray(parsedContent.mcqs)) {
                    canonicalQuestions.push(...parsedContent.mcqs);
                }
            } catch (error) {
                console.warn(`Could not parse JSON from document ${doc.fileName} for topic ${input.topic}`);
            }
        });

        if (canonicalQuestions.length > 0) {
            if (canonicalQuestions.length < input.numberOfQuestions) {
                console.warn(`Could only find ${canonicalQuestions.length} questions in the uploaded JSON files for topic "${input.topic}", though ${input.numberOfQuestions} were requested.`);
            }
            
            const processedQuestions = canonicalQuestions.map(mcq => {
                if (input.language && input.language !== 'English') {
                    const langKey = languageMap[input.language.toLowerCase()];
                    if (langKey && mcq.translations?.[langKey]) {
                        const translated = mcq.translations[langKey];
                        return {
                            ...mcq,
                            ...translated,
                            question: translated.question,
                            options: translated.options,
                            correctAnswer: translated.correctAnswer,
                            solution: translated.solution,
                        };
                    }
                }
                return mcq; // Return the original English MCQ
            });

            finalMCQs = shuffleArray(processedQuestions).slice(0, input.numberOfQuestions);
        }

    // **PRIORITY 2: Fallback to generating from raw .docx material**
    } else if (input.material) {
        let collectedMCQs: z.infer<typeof MCQSchema>[] = [];
        const collectedQuestionTexts = new Set<string>();
        
        const materialChunks: string[] = [];
        if (input.material.length <= MATERIAL_CHUNK_SIZE) {
            materialChunks.push(input.material);
        } else {
            for (let i = 0; i < input.material.length; i += MATERIAL_CHUNK_SIZE) {
                materialChunks.push(input.material.substring(i, i + MATERIAL_CHUNK_SIZE));
            }
        }
        
        for (const chunk of materialChunks) {
            if (collectedMCQs.length >= input.numberOfQuestions) break;

             const { output: extractedOutput } = await extractMCQsFromTextPrompt({
                textContent: chunk,
                topicName: input.topic,
                numberOfQuestions: input.numberOfQuestions - collectedMCQs.length,
                language: input.language,
            });

            if (extractedOutput && extractedOutput.mcqs) {
                 const validNewMcqs = extractedOutput.mcqs.filter(mcq => {
                    const questionText = mcq.question.trim();
                    const hasValidQuestion = questionText.toLowerCase() !== "string" && questionText.length > 1;
                    const hasValidOptions = mcq.options.every(opt => opt.trim().toLowerCase() !== "string" && opt.trim().length > 0);
                    const isNew = !collectedQuestionTexts.has(questionText);
                    return hasValidQuestion && hasValidOptions && isNew;
                });
                
                validNewMcqs.forEach(mcq => {
                    collectedMCQs.push(mcq);
                    collectedQuestionTexts.add(mcq.question.trim());
                });
            }
        }

        if (collectedMCQs.length < input.numberOfQuestions) {
            console.warn(`Could only find ${collectedMCQs.length} unique questions for topic "${input.topic}" after scanning the material, though ${input.numberOfQuestions} were requested.`);
        }
        
        if (collectedMCQs.length === 0) {
            throw new Error(`Failed to extract any valid questions for "${input.topic}". Please check the document formatting and content.`);
        }
        
        finalMCQs = shuffleArray(collectedMCQs).slice(0, input.numberOfQuestions);

    // **PRIORITY 3: No source material available**
    } else {
        throw new Error(`No question file (.json or .docx) is available for the topic "${input.topic}". Please upload a file to generate an exam.`);
    }

    let timeLimit;
    if (input.category === "Basic Arithmetics") {
        timeLimit = input.numberOfQuestions * 120; // 2 minutes for Arithmetics
    } else {
        timeLimit = input.numberOfQuestions * 45; // 45 seconds for others
    }

    const quizData = {
        topic: {
            id: input.topicId,
            title: input.topic,
            description: 'A custom generated exam.',
            icon: 'file-text',
            categoryId: input.category,
        },
        mcqs: finalMCQs,
        timeLimit,
    };

    const db = getFirebaseDb();
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    const docRef = await addDoc(collection(db, "generatedQuizzes"), quizData);

    return { quizId: docRef.id };
  }
);
