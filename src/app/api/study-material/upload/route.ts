

import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import pdf from 'pdf-parse';
import { StudyMaterial, Topic } from '@/lib/types';

export async function POST(request: Request) {
    console.log('API: Received registration request.');
    const db = getFirebaseDb();

    if (!db) {
        console.error('API Error: Firestore not initialized.');
        return NextResponse.json({ error: 'Firestore is not initialized.' }, { status: 500 });
    }
    
    try {
        const body = await request.json();
        const { topicName, contentUrl, fileName, examCategories } = body;
        console.log('API Request Body:', { topicName, contentUrl, fileName, examCategories });
        
        if (!topicName || !contentUrl || !examCategories || !examCategories.length) {
            return NextResponse.json({ error: 'Missing required fields: topicName, contentUrl, and examCategories are required.' }, { status: 400 });
        }

        let pdfBuffer: Buffer | null = null;
        try {
            console.log('API: Fetching PDF from:', contentUrl);
            const pdfResponse = await fetch(contentUrl, { next: { revalidate: 0 } });
            if (pdfResponse.ok) {
                pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
                console.log(`API: Successfully fetched PDF (${pdfBuffer.length} bytes).`);
            } else {
                console.warn(`API Warning: Could not fetch PDF. Status: ${pdfResponse.status}`);
            }
        } catch (fetchError) {
            console.error("API Error: Fetching PDF failed:", fetchError);
        }

        let textContent = "";
        if (pdfBuffer) {
            try {
                console.log('API: Starting PDF text extraction...');
                const pdfData = await pdf(pdfBuffer);
                textContent = pdfData.text;
                console.log(`API: Extracted ${textContent.length} characters.`);
            } catch (parseError: any) {
                console.error("API Error: PDF extraction failed:", parseError);
            }
        }

        let topicId: string | null = null;
        let newTopicRecord: Topic | null = null;

        const topicsRef = collection(db, 'topics');
        console.log('API: Checking for existing topic:', topicName);
        const q = query(topicsRef, where("title", "==", topicName));
        const qSnapshot = await getDocs(q);

        if (!qSnapshot.empty) {
            topicId = qSnapshot.docs[0].id;
            console.log('API: Existing topic found with ID:', topicId);
            
            // Extract existing categories and merge with new ones
            const existingTopic = qSnapshot.docs[0].data() as Topic;
            const existingCats = existingTopic.examCategories || [];
            const newCats = examCategories || [];
            const mergedCategories = Array.from(new Set([...existingCats, ...newCats]));
            
            // Update topic if categories have changed
            if (mergedCategories.length > existingCats.length) {
                console.log('API: Updating topic with merged exam categories:', mergedCategories);
                await updateDoc(doc(db, 'topics', topicId), { examCategories: mergedCategories });
            }
        } else {
            console.log('API: Creating new topic entry...');
            const newTopicData: Omit<Topic, 'id'> = {
                title: topicName,
                description: `Study material registered.`,
                icon: 'file-text',
                categoryId: 'uncategorized', 
                part: 'Part A', 
                examCategories: examCategories as any,
            };
            const topicDocRef = await addDoc(topicsRef, newTopicData);
            topicId = topicDocRef.id;
            newTopicRecord = { id: topicId, ...newTopicData } as Topic;
            console.log('API: New topic created with ID:', topicId);
        }
        
        if (!topicId) {
            throw new Error('Failed to find or create a topic entry.');
        }

        const studyMaterialData = {
            topicId: topicId,
            fileName: fileName || topicName,
            fileType: 'application/pdf',
            content: contentUrl, 
            uploadedAt: new Date(),
        };

        console.log('API: Adding study material record to Firestore...');
        const materialRef = await addDoc(collection(db, 'studyMaterials'), studyMaterialData);
        const newMaterial = { id: materialRef.id, ...studyMaterialData };
        console.log('API: Study material record added.');

        if (textContent) {
            console.log('API: Updating topic with extracted text...');
            const topicDocRef = doc(db, 'topics', topicId);
            const topicSnap = await getDoc(topicDocRef);
            const currentMaterial = topicSnap.exists() ? topicSnap.data()?.material || "" : "";
            
            const updatedMaterial = currentMaterial.includes(textContent.substring(0, 100)) 
                ? currentMaterial 
                : (currentMaterial ? currentMaterial + "\n\n" : "") + "--- Content from " + (fileName || topicName) + " ---\n\n" + textContent;
            
            await updateDoc(topicDocRef, { material: updatedMaterial });
            console.log('API: Topic material updated.');
        }

        console.log('API: Registration complete.');
        return NextResponse.json({
            message: 'Material registered successfully.',
            newMaterial,
            newTopic: newTopicRecord
        });

    } catch (error: any) {
        console.error('API Error details:', error);
        return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
    }
}
