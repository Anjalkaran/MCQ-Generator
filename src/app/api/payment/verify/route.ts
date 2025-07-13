'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = await req.json();
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
            throw new Error('Razorpay key secret is not configured.');
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body.toString())
            .digest('hex');

        const isVerified = expectedSignature === razorpay_signature;

        if (isVerified) {
            // Payment is legitimate. Update user's status in your database.
            // Here we reset the exam count to 0, effectively granting them a new quota.
            await adminDb.collection('users').doc(userId).update({
                topicExamsTaken: 0, 
                // You could also add a 'paid' status or subscription expiry date here.
            });
            
            await adminDb.collection('payments').doc(razorpay_payment_id).set({
                orderId: razorpay_order_id,
                userId: userId,
                status: 'successful',
                verifiedAt: new Date(),
            });

            return NextResponse.json({ isVerified: true, message: 'Payment verified successfully.' });
        } else {
            return NextResponse.json({ isVerified: false, message: 'Payment verification failed.' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Payment verification error:', error);
        return NextResponse.json({ error: 'Internal server error during payment verification.' }, { status: 500 });
    }
}
