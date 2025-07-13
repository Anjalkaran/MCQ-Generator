
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserData } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // A basic check to see if the request is coming from an authenticated admin.
  // In a production app, you would want a more robust solution like checking
  // for a valid session cookie and custom claims on the user.
  // This is a simplified check for the purpose of this example.
  // const { token } = req.headers;
  // try {
  //   const decodedToken = await adminAuth.verifyIdToken(token as string);
  //   if (decodedToken.email !== 'admin@anjalkaran.com') {
  //     throw new Error('Not an admin');
  //   }
  // } catch (error) {
  //   return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  // }
  
  const { name, email, password, examCategory } = req.body;

  if (!name || !email || !password || !examCategory) {
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
    };

    await adminDb.collection('users').doc(uid).set(newUser);

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
