
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const { userId, employeeId } = await req.json();

    if (!userId || !employeeId) {
      return NextResponse.json({ error: 'User ID and Employee ID are required.' }, { status: 400 });
    }
    
    // Basic validation for employeeId
    if (typeof employeeId !== 'string' || employeeId.length < 3) {
      return NextResponse.json({ error: 'Please enter a valid Employee ID.' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    
    await userRef.update({
        employeeId: employeeId,
    });
    
    return NextResponse.json({ status: 'success', message: 'Employee ID updated successfully.' });

  } catch (error: any) {
    console.error("Error updating employee ID:", error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
