
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserData } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, examCategory, isPro } = await req.json();

    if (!name || !email || !password || !examCategory) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    const newUser: Omit<UserData, 'uid'> & { isPro: boolean, proValidUntil?: Date } = {
      name,
      email,
      examCategory,
      topicExamsTaken: 0,
      mockTestsTaken: 0,
      isPro: isPro || false,
    };
    
    if (newUser.isPro) {
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
        newUser.proValidUntil = proValidUntil;
    }


    await adminDb.collection('users').doc(uid).set(newUser);

    const safeNewUser = {
        uid,
        name: newUser.name,
        email: newUser.email,
        examCategory: newUser.examCategory,
        topicExamsTaken: newUser.topicExamsTaken,
        mockTestsTaken: newUser.mockTestsTaken,
        isPro: newUser.isPro,
        proValidUntil: newUser.proValidUntil
    };

    return NextResponse.json({ message: 'User created successfully', newUser: safeNewUser }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'The email address is already in use by another account.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred while creating the user.' }, { status: 500 });
  }
}
