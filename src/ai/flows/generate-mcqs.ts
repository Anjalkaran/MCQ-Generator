'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) from a provided topic.
 *
 * - generateMCQs - A function that handles the MCQ generation process.
 * - GenerateMCQsOutput - The return type for the generateMCQs function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getTopicMCQsAdmin, getExamHistoryForUserAdmin } from '@/lib/firestore-admin';
import type { MCQ } from '@/lib/types';
import { getFirebaseDb } from '@/lib/firebase-admin';
import { shuffleArray } from '@/lib/utils';

// Generate a stable ID from question text (fallback when questionId is missing)
const makeQuestionId = (text: string): string =>
    text.replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 100);

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
    model: 'googleai/gemini-2.5-pro',
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

const generateKnowledgeMCQsPrompt = ai.definePrompt({
    name: 'generateKnowledgeMCQsPrompt',
    input: { schema: z.object({ topicName: z.string(), numberOfQuestions: z.number(), language: z.string().optional().default('English') }) },
    output: { schema: z.object({ mcqs: z.array(MCQSchema) }) },
    model: 'googleai/gemini-2.5-pro',
    prompt: `You are an expert quiz generator for Indian competitive exams. Your task is to generate {{numberOfQuestions}} multiple-choice questions (MCQs) on the topic of "{{topicName}}".

**CRITICAL INSTRUCTION - FACT VERIFICATION:** Before generating any question, you MUST verify every single fact and answer using Google Search and by cross-referencing with standard Indian school textbooks (like NCERT) and materials from reputable competitive exam coaching institutes. Accuracy is paramount.

**CRITICAL LANGUAGE INSTRUCTION: The language for the ENTIRE output, including the 'question', all strings in the 'options' array, the 'correctAnswer', and the 'solution', MUST be in {{language}}. Every single field must be in the requested language.**
**CRITICAL RULE FOR TRANSLATION:** When translating to any language other than English (e.g., Tamil, Hindi, Telugu, Kannada), you MUST keep all technical postal terms, scheme names, and abbreviations in English. Do NOT translate words like "Post Office", "Savings Bank", "Recurring Deposit (RD)", "PLI", "Postman", "Transit Mail Office", "Head Office", "Sub Office", etc.

**Instructions:**
1.  Create {{numberOfQuestions}} distinct and relevant questions.
2.  For each question, provide four plausible options.
3.  The 'correctAnswer' field MUST be an EXACT, case-sensitive match to one of the four strings in the 'options' array.
4.  Provide a brief but clear 'solution' or explanation for why the correct answer is right.
5.  For EACH generated question, you MUST add a 'topic' field with the value "{{topicName}}".

Your final output must be a single, valid JSON object containing an 'mcqs' array.
`
});

const MATERIAL_CHUNK_SIZE = 8000;


export async function generateMCQs(input: GenerateMCQsInput) {
  try {
    return await generateMCQsFlow(input);
  } catch (error: any) {
    console.error("MCQ Generation Error:", error);
    return { quizId: null, error: error.message || "An unexpected error occurred on the server." };
  }
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
    
    const userHistory = await getExamHistoryForUserAdmin(input.userId);
    const topicHistory = userHistory.filter(h => h.topicId === input.topicId);
    const answeredQuestionTexts = new Set(topicHistory.flatMap(h => h.questions));

    // **PRIORITY 1: Check for uploaded JSON files in the MCQ Bank**
    const uploadedMCQDocs = await getTopicMCQsAdmin(input.topicId, input.topic);
    let canonicalQuestions: MCQ[] = [];
    if (uploadedMCQDocs && uploadedMCQDocs.length > 0) {
        uploadedMCQDocs.forEach(doc => {
            try {
                const parsedContent = JSON.parse(doc.content);
                // Support: plain array, {mcqs:[]}, {questions:[]}
                if (Array.isArray(parsedContent)) {
                    canonicalQuestions.push(...parsedContent);
                } else if (parsedContent.mcqs && Array.isArray(parsedContent.mcqs)) {
                    canonicalQuestions.push(...parsedContent.mcqs);
                } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
                    canonicalQuestions.push(...parsedContent.questions);
                }
            } catch (error) {
                console.warn(`Could not parse JSON from document ${doc.fileName} for topic ${input.topic}`);
            }
        });
    }
    
    // Logic for selecting questions from the bank
    if (canonicalQuestions.length > 0) {
        // Filter out questions the user has already answered
        const unansweredQuestions = canonicalQuestions.filter(mcq => !answeredQuestionTexts.has(mcq.question.trim()));
        const answeredQuestions = canonicalQuestions.filter(mcq => answeredQuestionTexts.has(mcq.question.trim()));
        
        let selectedQuestions: MCQ[] = [];
        
        // 1. Take as many unanswered questions as possible up to the requested number
        selectedQuestions = shuffleArray([...unansweredQuestions]).slice(0, input.numberOfQuestions);
        
        // 2. If we still need more questions to reach the requested count, take from already answered ones
        if (selectedQuestions.length < input.numberOfQuestions && answeredQuestions.length > 0) {
            const needed = input.numberOfQuestions - selectedQuestions.length;
            const extra = shuffleArray([...answeredQuestions]).slice(0, needed);
            selectedQuestions = [...selectedQuestions, ...extra];
        }

        if (selectedQuestions.length > 0) {
             const processedQuestions = selectedQuestions.map(mcq => {
                const base = {
                    ...mcq,
                    topic: mcq.topic || input.topic,
                    solution: mcq.solution || "",
                };

                const lang = input.language || 'English';
                const langKey = lang.toLowerCase();
                const langCode = languageMap[langKey];
                
                const t = mcq.translations && (
                    mcq.translations[lang] || 
                    (langCode ? mcq.translations[langCode] : null) ||
                    mcq.translations[langKey]
                );

                if (t) {
                    return {
                        ...base,
                        question: t.question || base.question,
                        options: (t.options && t.options.length > 0) ? t.options : base.options,
                        correctAnswer: t.correctAnswer || base.correctAnswer,
                        solution: t.solution || base.solution,
                    };
                }
                return base;
            });

            finalMCQs = processedQuestions;
        }
    }

    if (finalMCQs.length > 0) {
        // We successfully found questions in the bank
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

    // **PRIORITY 3: Fallback to AI Generation if no material or bank questions are available**
    } else {
        const { output } = await generateKnowledgeMCQsPrompt({
            topicName: input.topic,
            numberOfQuestions: input.numberOfQuestions,
            language: input.language,
        });

        if (!output || !output.mcqs || output.mcqs.length === 0) {
            throw new Error(`The AI failed to generate any questions for "${input.topic}". Please try again.`);
        }
        finalMCQs = output.mcqs;
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
            categoryId: input.category || "uncategorized",
        },
        mcqs: shuffleArray(finalMCQs.map(m => ({
            questionId: m.questionId || makeQuestionId(m.question),
            topicId: m.topicId || input.topicId,
            question: m.question,
            options: shuffleArray([...m.options]),
            correctAnswer: m.correctAnswer,
            topic: m.topic || input.topic,
            solution: m.solution || ""
        }))),
        timeLimit,
        language: input.language,
        topicId: input.topicId 
    };

    const db = getFirebaseDb();
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    const docRef = await db.collection("generatedQuizzes").add(quizData);

    return { quizId: docRef.id };
  }
);