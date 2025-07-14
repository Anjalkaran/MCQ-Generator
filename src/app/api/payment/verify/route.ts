
'use server';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { razorpayInstance } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');
        const secret = process.env.RAZORPAY_KEY_SECRET;

        if (!signature || !secret) {
            console.error('Missing razorpay signature or secret');
            return NextResponse.json({ error: 'Request is missing required headers.' }, { status: 400 });
        }
        
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(body);
        const digest = shasum.digest('hex');

        if (digest === signature) {
            const parsedBody = JSON.parse(body);

            // Check if the event is payment.captured
            if (parsedBody.event !== 'payment.captured') {
                // It's a different event, so we can just acknowledge it without processing
                return NextResponse.json({ status: 'ignored', message: 'Event is not payment.captured' });
            }

            const userId = parsedBody.payload?.payment?.entity?.notes?.userId;
            
            if (!userId) {
                console.error('User ID not found in webhook payload notes:', parsedBody.payload?.payment?.entity?.notes);
                return NextResponse.json({ error: 'User ID not found in webhook payload.' }, { status: 400 });
            }
            
            // Update user's exam count in Firestore to upgrade them
            await adminDb().collection('users').doc(userId).update({
                topicExamsTaken: 0, 
            });
            
            // Record the successful payment for auditing
            await adminDb().collection('payments').add({
                razorpayPaymentId: parsedBody.payload?.payment?.entity?.id,
                userId: userId,
                amount: parsedBody.payload?.payment?.entity?.amount,
                currency: parsedBody.payload?.payment?.entity?.currency,
                status: 'successful',
                verifiedAt: new Date(),
                eventPayload: parsedBody,
            });

            return NextResponse.json({ status: 'success', message: 'Payment verified and user upgraded successfully.' });
        } else {
            console.warn('Payment verification failed: Signatures do not match.');
            // This is a critical security warning. Record the attempt.
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
