
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Topic, StudyMaterial } from '@/lib/types';
import pdf from 'pdf-parse';

export async function POST(request: Request) {
    const db = getFirebaseDb();
    if (!db) {
        return NextResponse.json({ error: 'Firestore is not initialized. Please check your configuration.' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { topicName, contentUrl, examCategories } = body;

        if (!topicName || !contentUrl || !examCategories || examCategories.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: topicName, contentUrl, and examCategories are required.' }, { status: 400 });
        }

        let textContent = "";
        try {
            console.log(`Attempting to fetch PDF from: ${contentUrl}`);
            const pdfResponse = await fetch(contentUrl, { next: { revalidate: 0 } });
            if (pdfResponse.ok) {
                const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
                const pdfData = await pdf(pdfBuffer);
                textContent = pdfData.text;
                console.log(`Successfully extracted ${textContent.length} characters from PDF.`);
            } else {
                console.warn(`Could not fetch PDF from URL. Status: ${pdfResponse.status}`);
            }
        } catch (parseError: any) {
            console.error("Failed to extract text from provided PDF URL:", parseError);
        }

        let topicId: string | null = null;
        let newTopic: Topic | null = null;

        const topicsRef = collection(db, 'topics');
        const q = query(topicsRef, where("title", "==", topicName));
        const querySnapshot = await getDocs(q);

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
            const topicDocRef = await addDoc(topicsRef, newTopicData);
            topicId = topicDocRef.id;
            newTopic = { id: topicId, ...newTopicData };
        }
        
        if (!topicId) {
            throw new Error('Failed to find or create a topic entry in the database.');
        }

        const studyMaterialData: Omit<StudyMaterial, 'id'> = {
            topicId: topicId,
            fileName: topicName,
            fileType: 'application/pdf',
            content: contentUrl, 
            uploadedAt: new Date(),
        };

        const materialRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialData);
        const newMaterial = { id: materialRef.id, ...studyMaterialData };

        if (textContent) {
            const topicDocRef = doc(db, 'topics', topicId);
            const topicSnap = await getDoc(topicDocRef);
            const currentMaterial = topicSnap.exists() ? topicSnap.data()?.material || "" : "";
            
            const updatedMaterial = currentMaterial.includes(textContent.substring(0, 100)) 
                ? currentMaterial 
                : currentMaterial + "\n\n--- Content from " + topicName + " ---\n\n" + textContent;
            
            await updateDoc(topicDocRef, { material: updatedMaterial });
        }

        return NextResponse.json({
            message: 'Material registered successfully.',
            newMaterial,
            newTopic
        });

    } catch (error: any) {
        console.error('API Error in registration route:', error);
        return NextResponse.json({ error: error.message || 'An unexpected server error occurred while processing the request.' }, { status: 500 });
    }
}
