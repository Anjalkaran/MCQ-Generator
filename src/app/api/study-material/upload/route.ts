
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import type { Topic } from '@/lib/types';
import formidable from 'formidable';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 300; 

// Helper to parse the incoming form data
const parseForm = (req: NextRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse(req as any, (err, fields, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({ fields, files });
        });
    });
};

// Function to find an existing topic or create a new one
const findOrCreateTopic = async (
    topicName: string,
    examCategories: ('MTS' | 'POSTMAN' | 'PA' | 'IP')[]
  ): Promise<string> => {
    
    // Find category for 'Uncategorized'
    let uncategorizedCatRef: FirebaseFirestore.DocumentReference | null = null;
    const catQuery = adminDb.collection('categories').where('name', '==', 'Uncategorized').limit(1);
    const catSnapshot = await catQuery.get();

    if (catSnapshot.empty) {
        // Create 'Uncategorized' category if it doesn't exist
        const newCat = await adminDb.collection('categories').add({
            name: 'Uncategorized',
            examCategories: ['MTS', 'POSTMAN', 'PA', 'IP'], // Assign to all by default
        });
        uncategorizedCatRef = newCat;
    } else {
        uncategorizedCatRef = catSnapshot.docs[0].ref;
    }

    // Check if a topic with this name already exists
    const topicQuery = adminDb.collection('topics').where('title', '==', topicName).limit(1);
    const topicSnapshot = await topicQuery.get();

    if (!topicSnapshot.empty) {
      // Topic exists, return its ID
      return topicSnapshot.docs[0].id;
    } else {
      // Topic does not exist, create it
      const newTopicData: Omit<Topic, 'id'> = {
        title: topicName,
        description: `Material for ${topicName}`,
        icon: 'file-text',
        categoryId: uncategorizedCatRef.id,
        part: 'Part A', // Default value
        examCategories,
      };
      const newTopicRef = await adminDb.collection('topics').add(newTopicData);
      return newTopicRef.id;
    }
};

export async function POST(req: NextRequest) {
    try {
        const { fields, files } = await parseForm(req);
        
        const file = files.file?.[0];
        const topicIdFromForm = fields.topicId?.[0];
        const examCategories = fields.examCategories?.[0]?.split(',');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        
        if (!examCategories || examCategories.length === 0) {
            return NextResponse.json({ error: 'At least one exam category must be selected.' }, { status: 400 });
        }

        let topicId: string;
        
        // If no topic is selected, create a new one based on the filename
        if (!topicIdFromForm || topicIdFromForm === 'new') {
            const fileNameWithoutExt = file.originalFilename.split('.').slice(0, -1).join('.');
            topicId = await findOrCreateTopic(fileNameWithoutExt, examCategories);
        } else {
            topicId = topicIdFromForm;
        }

        const bucket = adminStorage.bucket();
        const fileBuffer = await fs.readFile(file.filepath);
        const uniqueFileName = `${uuidv4()}-${file.originalFilename}`;
        const storageFile = bucket.file(`study-materials/${uniqueFileName}`);

        await storageFile.save(fileBuffer, {
            metadata: {
                contentType: file.mimetype,
            },
        });
        
        // Make the file publicly readable
        await storageFile.makePublic();

        // The public URL is what we will store in Firestore
        const publicUrl = storageFile.publicUrl();

        // Save the public URL to a new document in the `studyMaterials` collection
        const newMaterialRef = await adminDb.collection('studyMaterials').add({
            topicId: topicId,
            fileName: file.originalFilename,
            fileType: file.mimetype,
            content: publicUrl, // Store the public URL instead of text content
            uploadedAt: new Date(),
        });
        
        const newMaterial = {
            id: newMaterialRef.id,
            topicId: topicId,
            fileName: file.originalFilename,
            content: publicUrl,
        }

        return NextResponse.json({
            message: 'Study material uploaded and processed successfully.',
            document: newMaterial
        });

    } catch (error: any) {
        console.error('Error processing study material:', error);
        return NextResponse.json({ error: 'Error processing file: ' + error.message }, { status: 500 });
    }
}

    
