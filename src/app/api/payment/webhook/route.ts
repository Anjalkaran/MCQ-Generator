import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirebaseDb } from '@/lib/firebase-admin';
import { RAZORPAY_WEBHOOK_SECRET } from '@/lib/constants';

export const runtime = 'nodejs';

async function createNotification(db: any, userId: string, userName: string) {
    try {
        await db.collection('notifications').add({
            userId: userId,
            userName: userName,
            message: `${userName} upgraded to Pro via Razorpay Webhook.`,
            createdAt: new Date(),
            isRead: false
        });
    } catch (error) {
        console.error("Failed to create admin notification for webhook upgrade:", error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing Razorpay signature' }, { status: 400 });
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Webhook signature mismatch');
            return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
        }

        const body = JSON.parse(rawBody);
        const event = body.event;

        console.log(`Received Razorpay webhook event: ${event}`);

        if (event === 'payment.captured') {
            const payment = body.payload.payment.entity;
            const notes = payment.notes || {};
            const userId = notes.userId;
            const planType = notes.planType;

            if (!userId) {
                console.warn('Webhook payment captured but no userId found in notes:', payment.id);
                return NextResponse.json({ status: 'ignored', message: 'No userId in notes' });
            }

            console.log(`Processing captured payment: ${payment.id} for user: ${userId}`);

            let proValidUntil = new Date();
            if (planType === 'mts_monthly' || planType === 'postman_monthly' || planType === 'pa_monthly') {
                proValidUntil.setMonth(proValidUntil.getMonth() + 1);
            } else {
                proValidUntil.setFullYear(proValidUntil.getFullYear() + 1);
            }

            const db = getFirebaseDb();
            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                console.error(`User document ${userId} not found in Firestore for payment ${payment.id}`);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const userData = userSnap.data();
            const userName = userData?.name || 'A user';

            // Determine correct subscribedCategory based on planType
            let subscribedCategory = 'MTS';
            if (planType === 'pa_monthly') {
                subscribedCategory = 'PA';
            } else if (planType === 'postman_monthly') {
                subscribedCategory = 'POSTMAN';
            } else if (planType === 'mts_monthly') {
                subscribedCategory = 'MTS';
            } else {
                subscribedCategory = userData?.examCategory || 'MTS';
            }

            const contactStr = payment.contact ? String(payment.contact) : undefined;
            const phoneNumber = contactStr ? contactStr.replace(/^\+91/, '') : undefined;

            const updateData: { [key: string]: any } = {
                isPro: true,
                proValidUntil: proValidUntil,
                subscribedCategory: subscribedCategory,
                totalExamsTaken: 0,
            };

            if (phoneNumber) {
                updateData.phone = phoneNumber;
            }

            await userRef.update(updateData);
            await createNotification(db, userId, userName);

            console.log(`User ${userId} successfully upgraded to Pro via Webhook for payment ${payment.id}`);
            return NextResponse.json({ status: 'success', message: 'User upgraded successfully' });
        }

        return NextResponse.json({ status: 'ignored', message: 'Unhandled event type' });

    } catch (error: any) {
        console.error('Error handling Razorpay webhook:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
