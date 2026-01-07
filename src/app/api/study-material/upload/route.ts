
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { Topic } from '@/lib/types';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { formidable } from 'formidable';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 300; 

// Helper to parse the incoming form data
const parseForm = (req: NextRequest): Promise<{ fields: any; files: any }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        // The `req.body` needs to be correctly converted to a stream
        const bodyStream: any = req.body;
        form.parse(bodyStream, (err, fields, files) => {
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

        let content = '';
        const fileBuffer = await fs.readFile(file.filepath);

        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            content = result.value;
        } else if (file.mimetype === 'application/pdf') {
            const data = await pdf(fileBuffer);
            content = data.text;
        } else if (file.mimetype === 'text/plain') {
            content = fileBuffer.toString('utf-8');
        } else {
            return NextResponse.json({ error: `Unsupported file type: ${file.mimetype}` }, { status: 415 });
        }

        if (!content.trim()) {
            return NextResponse.json({ error: `Could not extract text from the file: ${file.originalFilename}` }, { status: 400 });
        }

        // Save the extracted content to a new document in the `studyMaterials` collection
        const newMaterialRef = await adminDb.collection('studyMaterials').add({
            topicId: topicId,
            fileName: file.originalFilename,
            fileType: file.mimetype,
            content: content,
            uploadedAt: new Date(),
        });
        
        // Also update the `material` field in the corresponding topic
        await adminDb.collection('topics').doc(topicId).update({
            material: content,
        });

        const newMaterial = {
            id: newMaterialRef.id,
            topicId: topicId,
            fileName: file.originalFilename,
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
