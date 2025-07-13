
import 'dotenv/config';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';


export async function POST(req: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = await req.json();
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
            return NextResponse.json({ error: "Missing required payment details." }, { status: 400 });
        }

        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!razorpayKeySecret) {
            console.error("RAZORPAY_KEY_SECRET is not defined in environment variables.");
            throw new Error("Payment verification key is not configured.");
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', razorpayKeySecret)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Signature is valid, update user in Firestore
            const userRef = adminDb.collection('users').doc(userId);
            
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            await userRef.update({
                paymentStatus: 'paid',
                paidUntil: expiryDate.toISOString(),
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                upgradedAt: FieldValue.serverTimestamp(),
            });

            return NextResponse.json({ success: true, message: "Payment verified successfully." });
        } else {
            return NextResponse.json({ success: false, error: "Invalid payment signature." }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Payment verification error:", error);
        return NextResponse.json({ error: 'Failed to verify payment. Check server logs for configuration issues.' }, { status: 500 });
    }
}
