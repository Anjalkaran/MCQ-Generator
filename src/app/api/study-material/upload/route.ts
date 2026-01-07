import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import type { StudyMaterial, Topic } from '@/lib/types';
import pdf from 'pdf-parse';

export const POST = async (req: Request) => {
    if (!adminDb || !adminStorage) {
        return new NextResponse(JSON.stringify({ error: 'Firebase Admin is not initialized' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const formData = await req.formData();
        const uploadedFile = formData.get('file') as File | null;
        
        if (!uploadedFile) {
            return new NextResponse(JSON.stringify({ error: 'No file uploaded.' }), { status: 400 });
        }

        const topicId = formData.get('topicId') as string | null;
        const examCategories = (formData.get('examCategories') as string | null)?.split(',') || [];
        
        const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

        const pdfData = await pdf(fileBuffer);
        const textContent = pdfData.text;

        const bucket = adminStorage.bucket();
        const filePath = `study-materials/${uuidv4()}-${uploadedFile.name}`;
        const file = bucket.file(filePath);

        await file.save(fileBuffer, {
            metadata: {
                contentType: uploadedFile.type,
            },
        });

        const [downloadURL] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // A very long expiration date
        });

        let finalTopicId = topicId;
        const topicsCollection = adminDb.collection('topics');

        if (topicId === 'new') {
            const newTopic: Omit<Topic, 'id'> = {
                title: uploadedFile.name?.replace(/\.[^/.]+$/, "") || "Untitled Topic",
                description: "Auto-generated topic from study material upload.",
                icon: 'file-text',
                categoryId: 'uncategorized',
                part: 'Part A',
                examCategories: examCategories as ('MTS' | 'POSTMAN' | 'PA' | 'IP')[],
                material: textContent
            };
            const topicRef = await topicsCollection.add(newTopic);
            finalTopicId = topicRef.id;
        } else if (finalTopicId) {
            const topicRef = topicsCollection.doc(finalTopicId);
            await topicRef.update({ material: textContent });
        }
        
        if (!finalTopicId) {
            return new NextResponse(JSON.stringify({ error: 'Topic ID is missing.' }), { status: 400 });
        }
        
        const studyMaterialDoc: Omit<StudyMaterial, 'id'> = {
            topicId: finalTopicId,
            fileName: uploadedFile.name || 'unnamed-file',
            fileType: uploadedFile.type || 'application/octet-stream',
            content: downloadURL,
            uploadedAt: new Date(),
        };

        const docRef = await adminDb.collection('studyMaterials').add(studyMaterialDoc);
        const newDocument = { id: docRef.id, ...studyMaterialDoc };

        return new NextResponse(JSON.stringify({ message: 'File uploaded successfully', document: newDocument }), { status: 200 });

    } catch (error: any) {
        console.error('File upload error:', error);
        return new NextResponse(JSON.stringify({ error: error.message || 'Failed to upload file.' }), { status: 500 });
    }
};
