
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, examCategory } = await req.json();

    if (!email || !password || !name || !examCategory) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      examCategory,
    });

    return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
