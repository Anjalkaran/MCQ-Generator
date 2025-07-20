
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { RAZORPAY_WEBHOOK_SECRET } from '@/lib/constants';
import crypto from 'crypto';
import type { Order } from 'razorpay/dist/types/orders';
import type { Payment } from 'razorpay/dist/types/payments';

async function addLog(logData: Record<string, any>) {
    try {
        await adminDb.collection('paymentLogs').add({
            ...logData,
            timestamp: new Date(),
        });
    } catch (e) {
        console.error("Failed to write to paymentLogs:", e);
    }
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!RAZORPAY_WEBHOOK_SECRET) {
        const errorMsg = 'Webhook secret not configured.';
        console.error(`FATAL ERROR: ${errorMsg}`);
        await addLog({ level: 'error', message: errorMsg, step: 'initialization' });
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
    
    if (!signature) {
         const errorMsg = 'Signature is missing from request.';
         await addLog({ level: 'error', message: errorMsg, step: 'signatureCheck' });
         return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    try {
        const shasum = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET);
        shasum.update(rawBody);
        const digest = shasum.digest('hex');

        if (digest !== signature) {
            const errorMsg = 'Payment verification failed: Invalid signature.';
            await addLog({ 
                level: 'warn', 
                message: errorMsg, 
                step: 'signatureCheck',
                generatedDigest: digest,
                receivedSignature: signature,
            });
            return NextResponse.json({ status: 'error', message: errorMsg }, { status: 400 });
        }
        
        await addLog({ level: 'info', message: 'Signature verified successfully.', step: 'signatureCheck' });
        const body = JSON.parse(rawBody);
        const { event, payload } = body;

        if (event === 'payment.captured' || event === 'order.paid') {
            await addLog({ level: 'info', message: `Processing event: '${event}'`, step: 'eventProcessing' });
            
            const orderEntity = payload.order?.entity as Order;
            const paymentEntity = payload.payment?.entity as Payment.Entity;
            
            const userId = orderEntity?.notes?.userId || paymentEntity?.notes?.userId;

            if (!userId) {
                const errorMsg = 'User ID not found in payment/order notes.';
                await addLog({
                    level: 'error',
                    message: errorMsg,
                    step: 'userIdExtraction',
                    payload: JSON.stringify(payload, null, 2)
                });
                return NextResponse.json({ error: errorMsg }, { status: 400 });
            }
            
            await addLog({ level: 'info', message: `User ID extracted successfully: '${userId}'`, step: 'userIdExtraction' });

            const proValidUntil = new Date();
            proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);

            const userRef = adminDb.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                const errorMsg = `User with ID '${userId}' not found in database.`;
                await addLog({ level: 'error', message: errorMsg, step: 'dbUserLookup' });
                return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            }
            
            await addLog({ level: 'info', message: `User found. Attempting to update user '${userId}' to Pro...`, step: 'dbUpdate' });
            await userRef.update({
                isPro: true,
                proValidUntil: proValidUntil,
                topicExamsTaken: 0,
            });
            await addLog({ level: 'info', message: `SUCCESS: Upgraded user '${userId}' to Pro.`, step: 'dbUpdate' });
            
            return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });
        }

        await addLog({ level: 'info', message: `Ignored event: '${event}'. No action taken.`, step: 'eventProcessing' });
        return NextResponse.json({ status: 'ignored', message: `Event ${event} not handled.` });

    } catch (error: any) {
        const errorMsg = 'A critical error occurred in the webhook.';
        console.error(errorMsg, error);
        await addLog({
            level: 'error',
            message: errorMsg,
            step: 'mainTryCatch',
            errorMessage: error.message,
            errorStack: error.stack
        });
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
