
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
        
        const isVerified = crypto.createHmac('sha256', secret)
            .update(body)
            .digest('hex') === signature;

        if (isVerified) {
            const parsedBody = JSON.parse(body);
            const { userId } = parsedBody;

            if (!userId) {
                return NextResponse.json({ error: 'User ID not found in webhook payload.' }, { status: 400 });
            }
            
            // Update user's exam count in Firestore
            await adminDb.collection('users').doc(userId).update({
                topicExamsTaken: 0, 
            });
            
            // Record the successful payment
            await adminDb.collection('payments').doc().set({
                event: parsedBody.event,
                payload: parsedBody.payload,
                userId: userId,
                status: 'successful',
                verifiedAt: new Date(),
            });

            return NextResponse.json({ isVerified: true, message: 'Payment verified successfully.' });
        } else {
            console.warn('Payment verification failed: Signatures do not match.');
            return NextResponse.json({ isVerified: false, message: 'Payment verification failed.' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Payment verification error:', error);
        return NextResponse.json({ error: 'Internal server error during payment verification.' }, { status: 500 });
    }
}
