
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { RAZORPAY_WEBHOOK_SECRET } from '@/lib/constants';
import crypto from 'crypto';
import type { Order } from 'razorpay/dist/types/orders';
import type { Payment } from 'razorpay/dist/types/payments';

export async function POST(req: NextRequest) {
    console.log("--- RAZORPAY WEBHOOK: STEP 1: INCOMING REQUEST ---");
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!RAZORPAY_WEBHOOK_SECRET) {
        console.error('--- RAZORPAY WEBHOOK: FATAL ERROR: Webhook secret is not set in environment variables.');
        return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
    }
    
    if (!signature) {
         console.error('--- RAZORPAY WEBHOOK: ERROR: Signature is missing from request.');
         return NextResponse.json({ error: 'Signature is missing.' }, { status: 400 });
    }
    console.log("--- RAZORPAY WEBHOOK: STEP 2: SIGNATURE FOUND ---");

    try {
        const shasum = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET);
        shasum.update(rawBody);
        const digest = shasum.digest('hex');

        if (digest !== signature) {
            console.warn(`--- RAZORPAY WEBHOOK: ERROR: SIGNATURE MISMATCH ---`);
            console.warn(`Generated Digest: ${digest}`);
            console.warn(`Received Signature: ${signature}`);
            return NextResponse.json({ status: 'error', message: 'Payment verification failed: Invalid signature.' }, { status: 400 });
        }
        
        console.log("--- RAZORPAY WEBHOOK: STEP 3: SIGNATURE VERIFIED SUCCESSFULLY ---");
        const body = JSON.parse(rawBody);
        const { event, payload } = body;

        if (event === 'payment.captured' || event === 'order.paid') {
            console.log(`--- RAZORPAY WEBHOOK: STEP 4: Processing event: '${event}' ---`);
            const orderEntity = payload.order?.entity as Order;
            const paymentEntity = payload.payment?.entity as Payment.Entity;
            
            const userId = orderEntity?.notes?.userId || paymentEntity?.notes?.userId;

            if (!userId) {
                console.error('--- RAZORPAY WEBHOOK: ERROR: USER ID NOT FOUND IN PAYLOAD ---');
                console.error('Payload for debugging:', JSON.stringify(payload, null, 2));
                return NextResponse.json({ error: 'User ID is missing from payment notes.' }, { status: 400 });
            }
            console.log(`--- RAZORPAY WEBHOOK: STEP 5: User ID Extracted Successfully: '${userId}' ---`);

            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

            const userRef = adminDb().collection('users').doc(userId);

            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                console.error(`--- RAZORPAY WEBHOOK: ERROR: User with ID '${userId}' not found in database.`);
                return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            }

            console.log(`--- RAZORPAY WEBHOOK: STEP 6: User found. Attempting to update user '${userId}' to Pro...`);
            await userRef.update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0,
            });
            console.log(`--- RAZORPAY WEBHOOK: STEP 7: SUCCESSFULLY UPGRADED USER '${userId}' TO PRO ---`);
            
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
            console.log(`--- RAZORPAY WEBHOOK: STEP 8: Payment log created for user '${userId}'. ---`);

            return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });
        }

        console.log(`--- RAZORPAY WEBHOOK: Ignored event: '${event}'. No action taken. ---`);
        return NextResponse.json({ status: 'ignored', message: `Event ${event} not handled.` });

    } catch (error: any) {
        console.error('--- RAZORPAY WEBHOOK: A CRITICAL ERROR OCCURRED ---');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
