
import { NextRequest, NextResponse } from 'next/server';
import { addReasoningQuestion, updateReasoningQuestion } from '@/lib/firestore';
import type { ReasoningQuestion } from '@/lib/types';

export const runtime = 'nodejs';
// Increase the max duration for this function to handle larger uploads.
export const maxDuration = 60; 


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { 
        id, // For updates
        questionText,
        questionImage, 
        options, 
        correctAnswer, 
        solutionImage, 
        solutionText, 
        isForLiveTest,
        topic,
    } = body;

    // --- Robust Server-Side Validation ---
    if (!questionText || !questionImage || !options || !correctAnswer || !topic) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length !== 4) {
        return NextResponse.json({ error: 'There must be exactly four options.' }, { status: 400 });
    }
    if (!options.includes(correctAnswer)) {
        return NextResponse.json({ error: 'The correct answer must be one of the four options.' }, { status: 400 });
    }
    // --- End Validation ---

    const questionData: Omit<ReasoningQuestion, 'id' | 'uploadedAt'> = {
        questionText,
        questionImage,
        options,
        correctAnswer,
        solutionImage: solutionImage || undefined,
        solutionText: solutionText || undefined,
        isForLiveTest: isForLiveTest || false,
        topic,
    }
    
    // Firestore does not allow 'undefined' values.
    if (!questionData.solutionImage) delete (questionData as Partial<typeof questionData>).solutionImage;
    if (!questionData.solutionText) delete (questionData as Partial<typeof questionData>).solutionText;

    if (id) {
        // This is an update
        await updateReasoningQuestion(id, questionData);
        const updatedDocument = { id, ...questionData, uploadedAt: new Date() }; // uploadedAt won't be updated, but needed for type
        return NextResponse.json({ 
            message: 'Reasoning question updated successfully.', 
            document: updatedDocument
        }, { status: 200 });

    } else {
        // This is a new creation
        const newQuestionDataWithDate = { ...questionData, uploadedAt: new Date() };
        const newDocRef = await addReasoningQuestion(newQuestionDataWithDate);
        const newDocument = { id: newDocRef.id, ...newQuestionDataWithDate };
        return NextResponse.json({ 
            message: 'Reasoning question uploaded successfully.', 
            document: newDocument
        }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error processing reasoning question:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON format in request body. The file might be too large.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error processing your request: ' + error.message }, { status: 500 });
  }
}
