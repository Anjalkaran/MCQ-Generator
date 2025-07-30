
import { NextRequest, NextResponse } from 'next/server';
import { addReasoningQuestion } from '@/lib/firestore';
import type { ReasoningQuestion } from '@/lib/types';

export const runtime = 'nodejs';
// Increase the max duration for this function to handle larger uploads.
export const maxDuration = 60; 


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { 
        questionText,
        questionImage, 
        options, 
        correctAnswer, 
        solutionImage, 
        solutionText, 
        examCategories, 
        isForLiveTest,
        topic,
    } = body;

    // --- Robust Server-Side Validation ---
    if (!questionText || !questionImage || !options || !correctAnswer || !examCategories || !topic) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length !== 4) {
        return NextResponse.json({ error: 'There must be exactly four options.' }, { status: 400 });
    }
    if (!options.includes(correctAnswer)) {
        return NextResponse.json({ error: 'The correct answer must be one of the four options.' }, { status: 400 });
    }
    if (!Array.isArray(examCategories) || examCategories.length === 0) {
        return NextResponse.json({ error: 'At least one exam category must be selected.' }, { status: 400 });
    }
    // --- End Validation ---

    const newQuestionData: Omit<ReasoningQuestion, 'id'> = {
        questionText,
        questionImage,
        options,
        correctAnswer,
        solutionImage: solutionImage || undefined,
        solutionText: solutionText || undefined,
        examCategories,
        isForLiveTest: isForLiveTest || false,
        topic,
        uploadedAt: new Date(),
    }
    
    // Firestore does not allow 'undefined' values.
    // We remove the keys if their values are falsy (e.g., undefined, null, empty string).
    if (!newQuestionData.solutionImage) {
        delete (newQuestionData as Partial<typeof newQuestionData>).solutionImage;
    }
    if (!newQuestionData.solutionText) {
        delete (newQuestionData as Partial<typeof newQuestionData>).solutionText;
    }
    
    const newDocRef = await addReasoningQuestion(newQuestionData);
    const newDocument = { id: newDocRef.id, ...newQuestionData };

    return NextResponse.json({ 
        message: 'Reasoning question uploaded successfully.', 
        newDocument
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error processing reasoning question:', error);
    // Check for specific JSON parsing errors
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON format in request body. The file might be too large.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error processing your request: ' + error.message }, { status: 500 });
  }
}
