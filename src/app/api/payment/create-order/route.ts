
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { razorpayInstance } from '@/lib/razorpay';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { userId, amount } = await req.json();

        if (!userId || !amount) {
            return NextResponse.json({ error: 'User ID and amount are required.' }, { status: 400 });
        }
        
        const amountInPaise = Math.round(amount * 100);

        if (isNaN(amountInPaise) || amountInPaise < 100) {
            return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
        }
        
        const receiptId = `receipt_${userId.slice(0,4)}_${crypto.randomBytes(4).toString('hex')}`;

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: receiptId,
            notes: {
                userId: userId,
            }
        };

        const order = await razorpayInstance.orders.create(options);
        
        return NextResponse.json(order);

    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        const errorMessage = error.error?.description || error.message || 'An unknown error occurred.';
        return NextResponse.json(
            { error: `Failed to create payment order: ${errorMessage}` },
            { status: 500 }
        );
    }
}
