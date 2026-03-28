
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import pdf from 'pdf-parse';
import { ADMIN_EMAILS } from '@/lib/constants';

async function isAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.email && ADMIN_EMAILS.includes(decodedToken.email);
    } catch (error) {
        console.error('Error verifying ID token:', error);
        return false;
    }
}

export async function POST(request: Request) {
    if (!await isAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const db = getFirebaseDb();

    try {
        const body = await request.json();
        const { topicName, contentUrl, fileName, examCategories } = body;
        
        if (!topicName || !contentUrl || !examCategories || !examCategories.length) {
            return NextResponse.json({ error: 'Missing required fields: topicName, contentUrl, and examCategories are required.' }, { status: 400 });
        }

        let pdfBuffer: Buffer | null = null;
        try {
            const pdfResponse = await fetch(contentUrl, { next: { revalidate: 0 } });
            if (pdfResponse.ok) {
                pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
            }
        } catch (fetchError) {
            console.error("API Error: Fetching PDF failed:", fetchError);
        }

        let textContent = "";
        if (pdfBuffer) {
            try {
                const pdfData = await pdf(pdfBuffer);
                textContent = pdfData.text;
            } catch (parseError: any) {
                console.error("API Error: PDF extraction failed:", parseError);
            }
        }

        let topicId: string | null = null;
        let newTopicRecord: any = null;

        const topicsRef = db.collection('topics');
        const qSnapshot = await topicsRef.where("title", "==", topicName).get();

        if (!qSnapshot.empty) {
            const topicDoc = qSnapshot.docs[0];
            topicId = topicDoc.id;
            
            const existingTopic = topicDoc.data();
            const existingCats = existingTopic.examCategories || [];
            const mergedCategories = Array.from(new Set([...existingCats, ...examCategories]));
            
            if (mergedCategories.length > existingCats.length) {
                await topicsRef.doc(topicId).update({ examCategories: mergedCategories });
            }
        } else {
            const newTopicData = {
                title: topicName,
                description: `Study material registered.`,
                icon: 'file-text',
                categoryId: 'uncategorized', 
                part: 'Part A', 
                examCategories: examCategories,
            };
            const topicDocRef = await topicsRef.add(newTopicData);
            topicId = topicDocRef.id;
            newTopicRecord = { id: topicId, ...newTopicData };
        }
        
        if (!topicId) throw new Error('Failed to find or create a topic entry.');

        const studyMaterialData = {
            topicId: topicId,
            fileName: fileName || topicName,
            fileType: 'application/pdf',
            content: contentUrl, 
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const materialRef = await db.collection('studyMaterials').add(studyMaterialData);
        const newMaterial = { id: materialRef.id, ...studyMaterialData };

        if (textContent) {
            const topicDocRef = topicsRef.doc(topicId);
            const topicSnap = await topicDocRef.get();
            const currentMaterial = topicSnap.exists ? topicSnap.get('material') || "" : "";
            
            const updatedMaterial = currentMaterial.includes(textContent.substring(0, 100)) 
                ? currentMaterial 
                : (currentMaterial ? currentMaterial + "\n\n" : "") + "--- Content from " + (fileName || topicName) + " ---\n\n" + textContent;
            
            await topicDocRef.update({ material: updatedMaterial });
        }

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
