
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
            console.error('Razorpay webhook secret is not set in environment variables.');
            return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
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
            const orderEntity = payload.order?.entity;
            const paymentEntity = payload.payment?.entity;
            
            // The userId is reliably in the notes of the order entity.
            const userId = orderEntity?.notes?.userId;

            if (!userId) {
                console.error('User ID not found in webhook payload notes.', JSON.stringify(payload, null, 2));
                return NextResponse.json({ error: 'User ID is missing from payment notes.' }, { status: 400 });
            }

            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

            const userRef = adminDb().collection('users').doc(userId);

            // Check if user exists before updating
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                console.error(`Attempted to upgrade non-existent user with ID: ${userId}`);
                return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            }

            await userRef.update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0 
            });
            
            // Use the most complete entity available for logging the payment
            const logEntity = paymentEntity || orderEntity;
            await adminDb().collection('payments').add({
                userId: userId,
                orderId: logEntity?.order_id || orderEntity?.id,
                razorpayPaymentId: paymentEntity?.id,
                status: 'successful',
                amount: logEntity?.amount / 100,
                currency: logEntity?.currency,
                verifiedAt: new Date(),
                webhookEvent: event,
            });

            return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });
        }

        return NextResponse.json({ status: 'ignored', message: `Event ${event} not handled.` });

    } catch (error: any) {
        console.error('Webhook Error:', error.message, error.stack);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
