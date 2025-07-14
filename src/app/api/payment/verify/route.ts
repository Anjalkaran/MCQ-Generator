
'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayKeySecret } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = await req.json();
        
        if (!razorpayKeySecret) {
            console.error('Razorpay key secret is not available from razorpay utility.');
            throw new Error('Razorpay key secret is not configured.');
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', razorpayKeySecret)
            .update(body.toString())
            .digest('hex');

        const isVerified = expectedSignature === razorpay_signature;

        if (isVerified) {
            // Update user's exam count in Firestore
            await adminDb.collection('users').doc(userId).update({
                topicExamsTaken: 0, 
            });
            
            // Record the successful payment
            await adminDb.collection('payments').doc(razorpay_payment_id).set({
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                userId: userId,
                status: 'successful',
                verifiedAt: new Date(),
            });

            return NextResponse.json({ isVerified: true, message: 'Payment verified successfully.' });
        } else {
            console.warn('Payment verification failed: Signatures do not match.');
            return NextResponse.json({ isVerified: false, message: 'Payment verification failed.' }, { status: 400 });
        }

    } catch (error: any)
        console.error('Payment verification error:', error);
        return NextResponse.json({ error: 'Internal server error during payment verification.' }, { status: 500 });
    }
}
