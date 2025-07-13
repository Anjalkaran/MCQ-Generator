
import 'dotenv/config';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebase-admin';

const initializeRazorpay = () => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.error("Razorpay keys are not configured in environment variables.");
        throw new Error('Razorpay keys are not configured.');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}


export async function POST(req: NextRequest) {
    try {
        const razorpay = initializeRazorpay();
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const userData = userDoc.data();
        const examCategory = userData?.examCategory;

        if (!examCategory) {
            return NextResponse.json({ error: 'User exam category not set.' }, { status: 400 });
        }

        const amountInRupees = examCategory === 'PA' ? 749 : 499;
        const amountInPaise = amountInRupees * 100;

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_order_${userId}_${Date.now()}`,
            notes: {
                userId: userId,
                examCategory: examCategory,
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json(order);

    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        return NextResponse.json({ error: 'Failed to create payment order. Check server logs for configuration issues.' }, { status: 500 });
    }
}
