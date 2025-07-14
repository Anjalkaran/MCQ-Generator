
'use server';
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';

function initializeRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay keys are not configured in environment variables.');
    }
    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}


export async function POST(req: NextRequest) {
    try {
        const razorpay = initializeRazorpay();
        const { userId, examCategory } = await req.json();

        if (!userId || !examCategory) {
            return NextResponse.json({ error: 'User ID and Exam Category are required.' }, { status: 400 });
        }
        
        const amountInRupees = examCategory === 'PA' ? 749 : 499;
        const amountInPaise = Math.round(amountInRupees * 100); // Ensure it's an integer

        if (isNaN(amountInPaise) || amountInPaise < 100) {
            return NextResponse.json({ error: 'Invalid amount calculated.' }, { status: 400 });
        }
        
        const receiptId = `receipt_${crypto.randomBytes(8).toString('hex')}`;

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: receiptId,
            notes: {
                userId: userId,
                examCategory: examCategory,
            }
        };

        const order = await razorpay.orders.create(options);
        
        return NextResponse.json(order);

    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        // Log the detailed error from Razorpay if available
        const errorMessage = error.error?.description || error.message || 'An unknown error occurred.';
        return NextResponse.json(
            { error: `Failed to create payment order: ${errorMessage}` },
            { status: 500 }
        );
    }
}
