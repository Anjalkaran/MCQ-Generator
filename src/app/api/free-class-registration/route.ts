
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { name, gender, mobileNumber, division, employeeId, designation, email, password, courses } = body;

    // --- Server-Side Validation ---
    if (!name || !gender || !mobileNumber || !division || !employeeId || !designation || !email || !courses || !Array.isArray(courses) || courses.length === 0) {
        return NextResponse.json({ error: 'All fields, including at least one course selection, are required.' }, { status: 400 });
    }

    // --- Uniqueness Check ---
    const registrationsRef = adminDb.collection('freeClassRegistrations');
    const emailQuery = registrationsRef.where('email', '==', email);
    const employeeIdQuery = registrationsRef.where('employeeId', '==', employeeId);

    const [emailSnapshot, employeeIdSnapshot] = await Promise.all([
      emailQuery.get(),
      employeeIdQuery.get(),
    ]);

    if (!emailSnapshot.empty) {
      return NextResponse.json({ error: 'This email address has already been registered for the free class.' }, { status: 409 });
    }
    if (!employeeIdSnapshot.empty) {
      return NextResponse.json({ error: 'This Employee ID has already been registered for the free class.' }, { status: 409 });
    }
    // --- End Uniqueness Check ---
    
    // Save registration details to a new collection
    const registrationData = {
        name,
        gender,
        mobileNumber,
        division,
        employeeId,
        designation,
        email,
        courses, // Save selected courses
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await adminDb.collection('freeClassRegistrations').add(registrationData);

    let userRecord;
    let newUserCreated = false;

    try {
        // Check if user already exists
        userRecord = await adminAuth.getUserByEmail(email);
        
        // If user exists, update their document with the new info
        await adminDb.collection('users').doc(userRecord.uid).set({
            phone: mobileNumber,
            employeeId: employeeId,
        }, { merge: true });

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, so create one if a password is provided
            if (!password || password.length < 6) {
                return NextResponse.json({ error: 'A password of at least 6 characters is required for new users.' }, { status: 400 });
            }
            
            userRecord = await adminAuth.createUser({
                email,
                emailVerified: false,
                password,
                displayName: name,
            });
            newUserCreated = true;

            // Create user document in 'users' collection
            await adminDb.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                name: name,
                email: email,
                phone: mobileNumber,
                employeeId: employeeId,
                city: division,
                examCategory: 'PA', // Default exam category, can be changed by user
                totalExamsTaken: 0,
                isPro: true,
                proValidUntil: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            });

        } else {
            // Some other error occurred while checking for the user
            throw error;
        }
    }

    return NextResponse.json({ 
        status: 'success', 
        message: 'Registration successful.',
        newUserCreated: newUserCreated,
        userId: userRecord.uid,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error during free class registration:", error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
