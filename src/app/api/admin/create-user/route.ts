

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserData } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    console.error("Firebase Admin SDK not initialized. API cannot function.");
    return NextResponse.json(
      { error: "Server configuration error. Please contact support." },
      { status: 500 }
    );
  }

  try {
    const { name, email, password, examCategory, isPro, city, division } = await req.json();

    // --- Robust Server-Side Validation ---
    if (!name || !email || !password || !examCategory || !city || !division) {
        return NextResponse.json({ error: 'Missing required fields: name, email, password, city, division and examCategory are all required.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'Password must be a string with at least 6 characters.' }, { status: 400 });
    }
    if (!email.toLowerCase().endsWith('@gmail.com')) {
        return NextResponse.json({ error: 'Only @gmail.com addresses are allowed for registration.' }, { status: 400 });
    }
    // --- End Validation ---

    // 1. Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // 2. Prepare user data for Firestore
    const newUserForDb: Partial<UserData> = {
      name,
      email,
      city,
      division,
      examCategory,
      totalExamsTaken: 0,
      isPro: isPro || false,
      createdAt: new Date(),
    };
    
    if (newUserForDb.isPro) {
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
        newUserForDb.proValidUntil = proValidUntil;
    } else {
        newUserForDb.proValidUntil = null;
    }

    // 3. Save user data to Firestore
    await adminDb.collection('users').doc(uid).set(newUserForDb);

    // 4. Prepare a clean, serializable object for the JSON response
    const safeNewUser: UserData = {
        uid,
        name: newUserForDb.name!,
        email: newUserForDb.email!,
        city: newUserForDb.city,
        division: newUserForDb.division,
        examCategory: newUserForDb.examCategory!,
        totalExamsTaken: newUserForDb.totalExamsTaken!,
        isPro: newUserForDb.isPro,
        // Convert dates to ISO string for safe JSON serialization
        proValidUntil: newUserForDb.proValidUntil ? newUserForDb.proValidUntil.toISOString() : undefined,
        createdAt: newUserForDb.createdAt ? newUserForDb.createdAt.toISOString() : undefined,
    };

    // 5. Return the successful response
    return NextResponse.json({ message: 'User created successfully', newUser: safeNewUser }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);

    // Provide specific feedback for common Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'The email address is already in use by another account.' }, { status: 409 });
    }
    if (error.code === 'auth/invalid-password') {
        return NextResponse.json({ error: 'The password is not valid. It must be a string of at least 6 characters.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'An unexpected error occurred while creating the user.' }, { status: 500 });
  }
}

    