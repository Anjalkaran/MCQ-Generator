
'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayInstance } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-razorpay-signature');

        const isValid = razorpayInstance.webhooks.validateWebhookSignature(
            JSON.stringify(body),
            signature!,
            process.env.RAZORPAY_WEBHOOK_SECRET!
        );
        
        if (isValid) {
            const { event, payload } = body;

            if (event === 'payment.captured' || event === 'order.paid') {
                const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
                const userId = paymentEntity?.notes?.userId;
            
                if (!userId) {
                    console.error('User ID not found in webhook payload notes:', paymentEntity?.notes);
                    return NextResponse.json({ error: 'User ID not found in webhook payload.' }, { status: 400 });
                }
                
                await adminDb().collection('users').doc(userId).update({
                    topicExamsTaken: 0,
                });
                
                await adminDb().collection('payments').add({
                    razorpayPaymentId: paymentEntity?.id,
                    razorpayOrderId: paymentEntity?.order_id,
                    userId: userId,
                    amount: paymentEntity?.amount,
                    currency: paymentEntity?.currency,
                    status: 'successful',
                    verifiedAt: new Date(),
                    eventPayload: body,
                });

                return NextResponse.json({ status: 'success', message: 'Payment verified and user upgraded successfully.' });
            }
             // Acknowledge other events without processing
            return NextResponse.json({ status: 'ignored', message: `Event type ${event} is not processed.` });

        } else {
            console.warn('Payment verification failed: Signatures do not match.');
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
