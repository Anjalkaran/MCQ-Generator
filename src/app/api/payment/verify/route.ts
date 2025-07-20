
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { RAZORPAY_WEBHOOK_SECRET } from '@/lib/constants';
import crypto from 'crypto';
import type { Order } from 'razorpay/dist/types/orders';
import type { Payment } from 'razorpay/dist/types/payments';

export async function POST(req: NextRequest) {
    console.log('[Webhook] STEP 1: Received request from Razorpay.');
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!RAZORPAY_WEBHOOK_SECRET) {
        console.error('[Webhook] FATAL ERROR: Razorpay webhook secret is not set in environment variables.');
        return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
    }
    
    if (!signature) {
         console.error('[Webhook] ERROR: Signature is missing from webhook request.');
         return NextResponse.json({ error: 'Signature is missing.' }, { status: 400 });
    }
    console.log('[Webhook] STEP 2: Signature found in header. Proceeding to verification.');

    try {
        const shasum = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET);
        shasum.update(rawBody);
        const digest = shasum.digest('hex');

        if (digest !== signature) {
            console.warn(`[Webhook] ERROR: Invalid Razorpay webhook signature. Verification failed. Digest: ${digest}, Signature: ${signature}`);
            return NextResponse.json({ status: 'error', message: 'Payment verification failed: Invalid signature.' }, { status: 400 });
        }
        
        console.log('[Webhook] STEP 3: Signature verified successfully.');
        const body = JSON.parse(rawBody);
        const { event, payload } = body;

        if (event === 'payment.captured' || event === 'order.paid') {
            console.log(`[Webhook] STEP 4: Processing relevant event: '${event}'.`);
            const orderEntity = payload.order?.entity as Order;
            const paymentEntity = payload.payment?.entity as Payment.Entity;
            
            const userId = orderEntity?.notes?.userId || paymentEntity?.notes?.userId;

            if (!userId) {
                console.error('[Webhook] ERROR: User ID not found in webhook payload notes.', JSON.stringify(payload, null, 2));
                return NextResponse.json({ error: 'User ID is missing from payment notes.' }, { status: 400 });
            }
            console.log(`[Webhook] STEP 5: Successfully extracted userId: '${userId}'.`);

            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

            const userRef = adminDb().collection('users').doc(userId);

            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                console.error(`[Webhook] ERROR: Attempted to upgrade non-existent user with ID: ${userId}`);
                return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            }

            console.log(`[Webhook] STEP 6: User found. Attempting to update user '${userId}' to Pro in Firestore.`);
            await userRef.update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0,
            });
            console.log(`[Webhook] STEP 7: Successfully upgraded user '${userId}' to Pro in Firestore.`);
            
            const logEntity = paymentEntity || orderEntity;
            await adminDb().collection('payments').add({
                userId: userId,
                orderId: logEntity?.order_id || orderEntity?.id,
                razorpayPaymentId: paymentEntity?.id,
                status: 'successful',
                amount: logEntity.amount / 100,
                currency: logEntity.currency,
                verifiedAt: new Date(),
                webhookEvent: event,
            });
            console.log(`[Webhook] STEP 8: Payment log created for user '${userId}'.`);

            return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });
        }

        console.log(`[Webhook] Ignored event: '${event}'. No action taken.`);
        return NextResponse.json({ status: 'ignored', message: `Event ${event} not handled.` });

    } catch (error: any) {
        console.error('[Webhook] A critical error occurred:', error.message, error.stack);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
