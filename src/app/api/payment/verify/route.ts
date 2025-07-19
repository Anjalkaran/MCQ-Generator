
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayInstance } from '@/lib/razorpay';
import { RAZORPAY_WEBHOOK_SECRET } from '@/lib/constants';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-razorpay-signature');

        if (!RAZORPAY_WEBHOOK_SECRET) {
            throw new Error('Razorpay webhook secret is not set.');
        }

        const isValid = razorpayInstance.webhooks.validateWebhookSignature(
            JSON.stringify(body),
            signature!,
            RAZORPAY_WEBHOOK_SECRET
        );

        if (!isValid) {
            console.warn('Invalid Razorpay webhook signature received.');
            return NextResponse.json({ status: 'error', message: 'Payment verification failed.' }, { status: 400 });
        }

        const { event, payload } = body;

        // Listen for the successful payment event
        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
            const userId = paymentEntity?.notes?.userId;

            if (!userId) {
                console.error('User ID not found in webhook payload.');
                return NextResponse.json({ error: 'User ID is missing from payment notes.' }, { status: 400 });
            }

            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

            // Update user document to grant Pro access
            await adminDb.collection('users').doc(userId).update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0 // Reset exam count
            });
            
            // Log the payment for records
            await adminDb.collection('payments').add({
                userId: userId,
                orderId: paymentEntity?.order_id,
                razorpayPaymentId: paymentEntity?.id,
                status: 'successful',
                amount: paymentEntity?.amount / 100, // Convert from paise to rupees
                currency: paymentEntity?.currency,
                verifiedAt: new Date(),
            });

            return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });
        }

        return NextResponse.json({ status: 'ignored', message: `Event ${event} not handled.` });

    } catch (error: any) {
        console.error('Webhook Error:', error.message, error.stack);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
