
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { razorpayInstance } from '@/lib/razorpay';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, amount } = body;

        // --- Robust Server-Side Validation ---
        if (!userId || !amount) {
            return NextResponse.json({ error: 'User ID and amount are required.' }, { status: 400 });
        }
        
        const amountInPaise = Math.round(amount * 100);

        if (isNaN(amountInPaise) || amountInPaise < 100) { // Assuming minimum payment of 1 INR
            return NextResponse.json({ error: 'Invalid amount. Amount must be at least 1 INR.' }, { status: 400 });
        }
        // --- End Validation ---
        
        // Use a more robust random receipt ID
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

        // Extract a more specific error message if available from Razorpay's response
        const errorMessage = error.error?.description || error.message || 'An unknown error occurred while creating the payment order.';
        
        return NextResponse.json(
            { error: `Failed to create payment order: ${errorMessage}` },
            { status: 500 }
        );
    }
}
