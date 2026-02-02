import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase-admin';
import type { Topic, StudyMaterial } from '@/lib/types';
import pdf from 'pdf-parse';

export async function POST(request: Request) {
    const db = getFirebaseDb();
    if (!db) {
        return NextResponse.json({ error: 'Firebase is not initialized.' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { topicName, contentUrl, examCategories } = body;

        if (!topicName || !contentUrl || !examCategories || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: topicName, contentUrl, and examCategories are required.' }, { status: 400 });
        }

        // 1. Attempt to fetch and parse the PDF text content for the AI
        let textContent = "";
        try {
            const pdfResponse = await fetch(contentUrl);
            if (pdfResponse.ok) {
                const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
                const pdfData = await pdf(pdfBuffer);
                textContent = pdfData.text;
            } else {
                console.warn(`Could not fetch PDF from URL for text extraction: ${contentUrl}`);
            }
        } catch (parseError) {
            console.error("Failed to extract text from provided PDF URL:", parseError);
            // We continue even if parsing fails, as the user might just want to store the link
        }

        // 2. Find or create the topic in Firestore
        let topicId: string | null = null;
        let newTopic: Topic | null = null;

        const topicsRef = db.collection('topics');
        const q = topicsRef.where("title", "==", topicName).limit(1);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            topicId = querySnapshot.docs[0].id;
        } else {
            const newTopicData: Omit<Topic, 'id'> = {
                title: topicName,
                description: "Study material registered from URL.",
                icon: 'file-text',
                categoryId: 'uncategorized', 
                part: 'Part A', 
                examCategories: examCategories as ('MTS' | 'POSTMAN' | 'PA' | 'IP')[],
            };
            const topicRef = await topicsRef.add(newTopicData);
            topicId = topicRef.id;
            newTopic = { id: topicId, ...newTopicData };
        }
        
        if (!topicId) {
            throw new Error('Failed to find or create a topic.');
        }

        // 3. Create the study material document in Firestore
        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: topicName,
            fileType: 'application/pdf',
            content: contentUrl, // Store the provided URL here
            uploadedAt: new Date(),
        };

        const docRef = await db.collection('studyMaterials').add(studyMaterialData);
        const newMaterial = { id: docRef.id, ...studyMaterialData };

        // 4. Update the topic's material field with the extracted text for AI context
        if (textContent) {
            const topicRef = db.collection('topics').doc(topicId);
            const topicSnap = await topicRef.get();
            const currentMaterial = topicSnap.exists ? topicSnap.data()?.material || "" : "";
            // Append new content if it doesn't already exist or if topic is new
            const updatedMaterial = currentMaterial.includes(textContent.substring(0, 100)) 
                ? currentMaterial 
                : currentMaterial + "\n\n--- Content from " + topicName + " ---\n\n" + textContent;
            
            await topicRef.update({ material: updatedMaterial });
        }

        return NextResponse.json({
            message: 'Material registered successfully.',
            newMaterial,
            newTopic
        });

    } catch (error: any) {
        console.error('API Error in registration route:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
