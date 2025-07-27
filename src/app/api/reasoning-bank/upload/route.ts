
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';

// Helper to get the Storage bucket
const getBucket = () => {
    // Check if the default app is initialized and has a bucket.
    if (!admin.apps[0]?.options.storageBucket) {
        // If not, try to use the project ID to construct the bucket name.
        const projectId = process.env.FIREBASE_PROJECT_ID;
        if (!projectId) {
            throw new Error("Firebase project ID is not configured. Cannot determine storage bucket.");
        }
        const bucketName = `gs://${projectId}.appspot.com`;
        console.log(`Default storage bucket not found, attempting to use bucket: ${bucketName}`);
        return admin.storage().bucket(bucketName);
    }
    return admin.storage().bucket();
};

async function uploadImage(file: File): Promise<string> {
    const bucket = getBucket();
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `reasoning-questions/${Date.now()}-${file.name}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(buffer, {
        metadata: { contentType: file.type },
    });
    
    // Make the file publicly accessible
    await fileUpload.makePublic();

    // Return the public URL
    return fileUpload.publicUrl();
}

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const questionImage = formData.get('questionImage') as File | null;
        const questionText = formData.get('questionText') as string | null;
        const optionImage1 = formData.get('optionImage1') as File | null;
        const optionImage2 = formData.get('optionImage2') as File | null;
        const optionImage3 = formData.get('optionImage3') as File | null;
        const optionImage4 = formData.get('optionImage4') as File | null;
        const solutionImage = formData.get('solutionImage') as File | null;
        const correctAnswerIndex = formData.get('correctAnswerIndex') as string | null;
        const examCategories = formData.getAll('examCategories') as string[];

        if (!questionImage || !optionImage1 || !optionImage2 || !optionImage3 || !optionImage4 || correctAnswerIndex === null || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        // Upload all images in parallel
        const [
            questionImageUrl,
            optionImageUrl1,
            optionImageUrl2,
            optionImageUrl3,
            optionImageUrl4,
            solutionImageUrl
        ] = await Promise.all([
            uploadImage(questionImage),
            uploadImage(optionImage1),
            uploadImage(optionImage2),
            uploadImage(optionImage3),
            uploadImage(optionImage4),
            solutionImage ? uploadImage(solutionImage) : Promise.resolve(null)
        ]);

        const newQuestionData = {
            questionImageUrl,
            questionText: questionText || null,
            optionImageUrls: [optionImageUrl1, optionImageUrl2, optionImageUrl3, optionImageUrl4],
            solutionImageUrl: solutionImageUrl,
            correctAnswerIndex: parseInt(correctAnswerIndex, 10),
            examCategories: examCategories,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await adminDb.collection('reasoningBank').add(newQuestionData);

        return NextResponse.json({ 
            message: 'Reasoning question uploaded successfully.', 
            newQuestion: { id: docRef.id, ...newQuestionData }
        });

    } catch (error: any) {
        console.error('Error processing reasoning question upload:', error);
        return NextResponse.json({ error: 'Error processing files: ' + error.message }, { status: 500 });
    }
}
