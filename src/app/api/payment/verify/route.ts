import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirebaseDb } from '@/lib/firebase-admin';
import { RAZORPAY_KEY_SECRET } from '@/lib/constants';
import { razorpayInstance } from '@/lib/razorpay';

export const runtime = 'nodejs';

async function createNotification(userId: string, userName: string) {
    try {
        const db = getFirebaseDb();
        await db.collection('notifications').add({
            userId: userId,
            userName: userName,
            message: `${userName} has upgraded to a Pro account via payment.`,
            createdAt: new Date(),
            isRead: false
        });
    } catch (error) {
        console.error("Failed to create admin notification for pro upgrade:", error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planType } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !planType) {
            return NextResponse.json({ error: 'Missing payment verification details.' }, { status: 400 });
        }

        const generated_signature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: 'Payment verification failed. Signature mismatch.' }, { status: 400 });
        }
        
        const paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);
        const contactStr = paymentDetails.contact ? String(paymentDetails.contact) : undefined;
        const phoneNumber = contactStr ? contactStr.replace(/^\+91/, '') : undefined;
        
        let proValidUntil = new Date();

        if (planType === 'mts_monthly' || planType === 'postman_monthly' || planType === 'pa_monthly') {
            proValidUntil.setMonth(proValidUntil.getMonth() + 1);
        } else { // Fallback standard 1-year plan
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
        }

        const db = getFirebaseDb();
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const userName = userData?.name || 'A user';
        
        const updateData: { [key: string]: any } = {
            isPro: true,
            proValidUntil: proValidUntil,
            subscribedCategory: userData?.examCategory || 'MTS',
            totalExamsTaken: 0,
        };

        if (phoneNumber) {
            updateData.phone = phoneNumber;
        }
        
        await userRef.update(updateData);
        
        await createNotification(userId, userName);

        return NextResponse.json({ 
            status: 'success', 
            message: 'Payment verified and user upgraded to Pro.',
            proValidUntil: proValidUntil.toISOString(),
        });

    } catch (error: any) {
        console.error("Error during payment verification and user upgrade:", error);
        return NextResponse.json({ error: 'An internal server error occurred during payment verification.' }, { status: 500 });
    }
}
