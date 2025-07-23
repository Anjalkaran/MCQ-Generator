
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addAdminNotification, getUserData } from '@/lib/firestore'; // Assuming getUserData can work server-side if needed, or adjust as necessary

export const runtime = 'nodejs';

async function createNotification(userId: string) {
    if (!adminDb) return; // Silently fail if admin isn't setup
    try {
        // We need the user's name for the notification message.
        // Let's get it directly from the users collection.
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const userName = userData?.name || 'A user';

        await addAdminNotification({
            userId: userId,
            userName: userName,
            message: `${userName} has upgraded to a Pro account.`
        });
    } catch (error) {
        console.error("Failed to create admin notification for pro upgrade:", error);
        // Don't block the main API response for this
    }
}


export async function POST(req: NextRequest) {
    if (!adminDb) {
        console.error("Firebase Admin SDK not initialized. API cannot function.");
        return NextResponse.json(
            { error: "Server configuration error. Please contact support." },
            { status: 500 }
        );
    }

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }
        
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({
            isPro: true,
            proValidUntil: proValidUntil,
            topicExamsTaken: 0,
            mockTestsTaken: 0,
        });
        
        // After successfully upgrading, create the notification
        await createNotification(userId);

        return NextResponse.json({ status: 'success', message: 'User upgraded to Pro successfully.' });

    } catch (error: any) {
        console.error("Error upgrading user to pro:", error);
        return NextResponse.json({ error: 'An internal server error occurred while upgrading the user.' }, { status: 500 });
    }
}
