
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayInstance } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-razorpay-signature');

        if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
            throw new Error('Razorpay webhook secret is not set.');
        }

        // Securely validate the webhook signature
        const isValid = razorpayInstance.webhooks.validateWebhookSignature(
            JSON.stringify(body),
            signature!,
            process.env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!isValid) {
            return NextResponse.json({ status: 'error', message: 'Payment verification failed.' }, { status: 400 });
        }

        const { event, payload } = body;

        // Process only successful payment events
        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
            const userId = paymentEntity?.notes?.userId;

            if (!userId) {
                console.error('User ID not found in webhook payload.');
                return NextResponse.json({ error: 'User ID is missing.' }, { status: 400 });
            }

            // --- USER UPGRADE LOGIC ---
            // This is where the user officially becomes a pro user.
            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1); // Set validity for 1 year

            await adminDb().collection('users').doc(userId).update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0 // Also reset the count
            });
            // --- END OF UPGRADE LOGIC ---
            
            // Optionally, log the payment for your records
            await adminDb().collection('payments').add({
                userId: userId,
                razorpayPaymentId: paymentEntity?.id,
                status: 'successful',
                amount: paymentEntity?.amount,
                verifiedAt: new Date(),
            });

            return NextResponse.json({ status: 'success' });
        }

        // Acknowledge other events without taking action
        return NextResponse.json({ status: 'ignored' });

    } catch (error: any) {
        console.error('Webhook Error:', error.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
