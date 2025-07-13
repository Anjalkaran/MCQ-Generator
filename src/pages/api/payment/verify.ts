
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { updateUserPaymentStatus } from '@/lib/firestore';

const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keySecret) {
    throw new Error("Razorpay Key Secret is not configured in environment variables.");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
        return res.status(400).json({ error: 'Missing required payment details.' });
    }

    try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body.toString())
            .digest('hex');
        
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Signature is valid, update user status in Firestore
            await updateUserPaymentStatus(userId, razorpay_order_id);

            return res.status(200).json({ success: true, message: "Payment verified and user status updated." });
        } else {
            return res.status(400).json({ success: false, error: "Invalid signature." });
        }

    } catch (error: any) {
        console.error("Payment verification failed:", error);
        return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
}
