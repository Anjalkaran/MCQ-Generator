
'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayInstance, razorpayKeySecret } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature || !razorpayKeySecret) {
            console.error('Missing razorpay signature or secret');
            return NextResponse.json({ error: 'Request is missing required headers.' }, { status: 400 });
        }
        
        const shasum = crypto.createHmac('sha256', razorpayKeySecret);
        shasum.update(body);
        const digest = shasum.digest('hex');

        if (digest === signature) {
            const parsedBody = JSON.parse(body);
            const eventType = parsedBody.event;

            if (eventType === 'payment.captured' || eventType === 'order.paid') {
                const paymentEntity = parsedBody.payload?.payment?.entity || parsedBody.payload?.order?.entity;
                const userId = paymentEntity?.notes?.userId;
            
                if (!userId) {
                    console.error('User ID not found in webhook payload notes:', paymentEntity?.notes);
                    return NextResponse.json({ error: 'User ID not found in webhook payload.' }, { status: 400 });
                }
                
                // Update user's exam count in Firestore to upgrade them
                await adminDb().collection('users').doc(userId).update({
                    isPremium: true,
                    topicExamsTaken: 0, 
                });
                
                // Record the successful payment for auditing
                await adminDb().collection('payments').add({
                    razorpayPaymentId: paymentEntity?.id,
                    razorpayOrderId: paymentEntity?.order_id,
                    userId: userId,
                    amount: paymentEntity?.amount,
                    currency: paymentEntity?.currency,
                    status: 'successful',
                    verifiedAt: new Date(),
                    eventPayload: parsedBody,
                });

                return NextResponse.json({ status: 'success', message: 'Payment verified and user upgraded successfully.' });
            }
             // Acknowledge other events without processing
            return NextResponse.json({ status: 'ignored', message: `Event type ${eventType} is not processed.` });

        } else {
            console.warn('Payment verification failed: Signatures do not match.');
            // This is a critical security warning. Record the attempt.
            await adminDb().collection('payments').add({
                status: 'verification_failed',
                attemptedAt: new Date(),
                headers: Object.fromEntries(req.headers.entries()),
                body: body,
            });
            return NextResponse.json({ status: 'error', message: 'Payment verification failed.' }, { status: 400 });
        }

    } catch (error: any) {
         console.error('Payment verification error:', error);
         return NextResponse.json({ error: 'Internal server error during payment verification.' }, { status: 500 });
    }
}
