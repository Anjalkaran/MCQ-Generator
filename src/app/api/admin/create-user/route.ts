
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserData } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, examCategory, paymentStatus } = await req.json();

    if (!name || !email || !password || !examCategory || !paymentStatus) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    let paidUntil = null;
    if (paymentStatus === 'paid') {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      paidUntil = expiryDate.toISOString();
    }

    // Create user document in Firestore
    const newUser: UserData = {
      uid,
      name,
      email,
      examCategory,
      paymentStatus,
      topicExamsTaken: 0,
      mockTestsTaken: 0,
      paidUntil,
    };

    await adminDb.collection('users').doc(uid).set(newUser);

    return NextResponse.json({ message: 'User created successfully', newUser: { id: uid, ...newUser} }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'The email address is already in use by another account.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred while creating the user.' }, { status: 500 });
  }
}
