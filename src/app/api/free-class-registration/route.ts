
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const runtime = 'nodejs';

// Function to generate a random password
const generatePassword = (length = 8) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
};

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { name, gender, mobileNumber, division, employeeId, designation, email } = body;

    // --- Server-Side Validation ---
    if (!name || !gender || !mobileNumber || !division || !employeeId || !designation || !email) {
        return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    
    // Save registration details to a new collection
    const registrationData = {
        name,
        gender,
        mobileNumber,
        division,
        employeeId,
        designation,
        email,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await adminDb.collection('freeClassRegistrations').add(registrationData);

    let userRecord;
    let newUserCreated = false;

    try {
        // Check if user already exists
        userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, so create one
            const password = generatePassword(10);
            
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
                city: division,
                examCategory: 'PA', // Default exam category, can be changed by user
                totalExamsTaken: 0,
                isPro: true,
                proValidUntil: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            });

            // You might want to send the user their password via email
            // This would require an email sending service (e.g., SendGrid, Nodemailer)
            // For now, we'll log it for the admin.
            console.log(`New user created. Email: ${email}, Password: ${password}`);

        } else {
            // Some other error occurred
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
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
