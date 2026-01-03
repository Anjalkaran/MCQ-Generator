
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!adminAuth) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        await adminAuth.getUserByEmail(email);
        // If the above line doesn't throw an error, the user exists.
        return NextResponse.json({ exists: true });

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // This is the expected case for a new user.
            return NextResponse.json({ exists: false });
        }
        // Log other unexpected errors.
        console.error("Error checking email existence:", error);
        return NextResponse.json({ error: 'Failed to check email status.' }, { status: 500 });
    }
}
