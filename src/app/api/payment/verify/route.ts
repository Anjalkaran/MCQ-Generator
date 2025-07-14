
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

        const isValid = razorpayInstance.webhooks.validateWebhookSignature(
            JSON.stringify(body),
            signature!,
            process.env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!isValid) {
            return NextResponse.json({ status: 'error', message: 'Payment verification failed.' }, { status: 400 });
        }

        const { event, payload } = body;

        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
            const userId = paymentEntity?.notes?.userId;

            if (!userId) {
                console.error('User ID not found in webhook payload.');
                return NextResponse.json({ error: 'User ID is missing.' }, { status: 400 });
            }

            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

            await adminDb().collection('users').doc(userId).update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0 
            });
            
            await adminDb().collection('payments').add({
                userId: userId,
                razorpayPaymentId: paymentEntity?.id,
                status: 'successful',
                amount: paymentEntity?.amount,
                verifiedAt: new Date(),
            });

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored' });

    } catch (error: any) {
        console.error('Webhook Error:', error.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
