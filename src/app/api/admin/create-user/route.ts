
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserData } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    console.error("Firebase Admin SDK not initialized. API cannot function.");
    return NextResponse.json(
      { error: "Server configuration error. Please contact support." },
      { status: 500 }
    );
  }

  try {
    const { name, email, password, examCategory, isPro } = await req.json();

    if (!name || !email || !password || !examCategory) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // 2. Prepare user data for Firestore
    const newUserForDb: Omit<UserData, 'uid'> = {
      name,
      email,
      examCategory,
      topicExamsTaken: 0,
      mockTestsTaken: 0,
      isPro: isPro || false,
    };
    
    if (newUserForDb.isPro) {
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
        newUserForDb.proValidUntil = proValidUntil;
    }

    // 3. Save user data to Firestore
    await adminDb.collection('users').doc(uid).set(newUserForDb);

    // 4. Prepare a clean, serializable object for the JSON response
    const safeNewUser: UserData = {
        uid,
        name: newUserForDb.name,
        email: newUserForDb.email,
        examCategory: newUserForDb.examCategory,
        topicExamsTaken: newUserForDb.topicExamsTaken,
        mockTestsTaken: newUserForDb.mockTestsTaken,
        isPro: newUserForDb.isPro,
        // Convert date to ISO string for safe JSON serialization if it exists
        proValidUntil: newUserForDb.proValidUntil ? newUserForDb.proValidUntil.toISOString() : undefined,
    };

    // 5. Return the successful response
    return NextResponse.json({ message: 'User created successfully', newUser: safeNewUser }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'The email address is already in use by another account.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred while creating the user.' }, { status: 500 });
  }
}
