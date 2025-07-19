
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayInstance } from '@/lib/razorpay';
import { RAZORPAY_WEBHOOK_SECRET } from '@/lib/constants';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!RAZORPAY_WEBHOOK_SECRET) {
            console.error('Razorpay webhook secret is not set.');
            throw new Error('Razorpay webhook secret is not set.');
        }

        const shasum = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET);
        shasum.update(rawBody);
        const digest = shasum.digest('hex');

        if (digest !== signature) {
            console.warn('Invalid Razorpay webhook signature received.');
            return NextResponse.json({ status: 'error', message: 'Payment verification failed: Invalid signature.' }, { status: 400 });
        }
        
        const body = JSON.parse(rawBody);
        const { event, payload } = body;

        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload.payment?.entity || payload.order?.entity;
            const userId = paymentEntity?.notes?.userId;

            if (!userId) {
                console.error('User ID not found in webhook payload.', JSON.stringify(payload, null, 2));
                return NextResponse.json({ error: 'User ID is missing from payment notes.' }, { status: 400 });
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
                orderId: paymentEntity?.order_id,
                razorpayPaymentId: paymentEntity?.id,
                status: 'successful',
                amount: paymentEntity?.amount / 100,
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
