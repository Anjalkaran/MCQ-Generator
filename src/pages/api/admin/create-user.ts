
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserData } from '@/lib/types';
import { createUserDocument } from '@/lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic security check - in a real app, verify the caller is an admin
  // via session tokens and custom claims.
  
  const { name, email, password, examCategory, paymentStatus } = req.body;

  if (!name || !email || !password || !examCategory || !paymentStatus) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // Create user document in Firestore
    const newUser: UserData = {
      id: uid, // Use uid as the document id for consistency
      uid,
      name,
      email,
      examCategory,
      paymentStatus,
      topicExamsTaken: 0,
      mockTestsTaken: 0,
    };

    await createUserDocument(newUser);

    return res.status(201).json({ message: 'User created successfully', newUser });

  } catch (error: any) {
    console.error('Error creating user:', error);
    // Provide more specific error messages
    if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'The email address is already in use by another account.' });
    }
    return res.status(500).json({ error: 'Failed to create user. ' + (error.message || '') });
  }
}
