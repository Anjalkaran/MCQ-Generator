
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { addAdminNotification } from '@/lib/firestore';
import { RAZORPAY_KEY_SECRET } from '@/lib/constants';

export const runtime = 'nodejs';

async function createNotification(userId: string) {
    if (!adminDb) return;
    try {
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const userName = userData?.name || 'A user';

        await addAdminNotification({
            userId: userId,
            userName: userName,
            message: `${userName} has upgraded to a Pro account via payment.`
        });
    } catch (error) {
        console.error("Failed to create admin notification for pro upgrade:", error);
    }
}

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
            return NextResponse.json({ error: 'Missing payment verification details.' }, { status: 400 });
        }

        const generated_signature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Payment verification failed. Signature mismatch.' }, { status: 400 });
        }
        
        // --- Signature is valid, proceed to upgrade user ---
        const proValidUntil = new Date();
        proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({
            isPro: true,
            proValidUntil: proValidUntil,
            totalExamsTaken: 0, // Reset the exam counter upon upgrade
        });
        
        // After successfully upgrading, create the notification
        await createNotification(userId);

        return NextResponse.json({ status: 'success', message: 'Payment verified and user upgraded to Pro.' });

    } catch (error: any) {
        console.error("Error during payment verification and user upgrade:", error);
        return NextResponse.json({ error: 'An internal server error occurred during payment verification.' }, { status: 500 });
    }
}
