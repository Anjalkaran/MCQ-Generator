
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';
import type { Order } from 'razorpay/dist/types/orders';
import type { Payment } from 'razorpay/dist/types/payments';

async function addLog(logData: Record<string, any>) {
    const logString = `[Payment Webhook] step: ${logData.step} | message: ${logData.message}`;
    console.log(logString); // Add console logging for visibility in server logs

    try {
        await adminDb.collection('paymentLogs').add({
            ...logData,
            timestamp: new Date(),
        });
    } catch (e) {
        console.error("CRITICAL: Failed to write to paymentLogs. Check Firebase Admin SDK credentials in your hosting environment.", e);
    }
}

export async function POST(req: NextRequest) {
    const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!RAZORPAY_WEBHOOK_SECRET) {
        const errorMsg = 'FATAL: RAZORPAY_WEBHOOK_SECRET not configured in the server environment. This must be set in your hosting provider (e.g., Vercel, Netlify).';
        // Use addLog to ensure this critical configuration error is logged.
        await addLog({ level: 'error', message: errorMsg, step: 'initialization' });
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }
    
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
             const errorMsg = 'Signature is missing from request.';
             await addLog({ level: 'error', message: errorMsg, step: 'signatureCheck' });
             return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

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
                mockTestsTaken: 0,
            });
            await addLog({ level: 'info', message: `SUCCESS: Upgraded user '${userId}' to Pro.`, step: 'dbUpdate' });
            
            return NextResponse.json({ status: 'success', message: 'User upgraded to Pro.' });
        }

        await addLog({ level: 'info', message: `Ignored event: '${event}'. No action taken.`, step: 'eventProcessing' });
        return NextResponse.json({ status: 'ignored', message: `Event ${event} not handled.` });

    } catch (error: any) {
        const errorMsg = 'A critical error occurred in the webhook.';
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
