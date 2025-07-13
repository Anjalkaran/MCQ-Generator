
import { config } from 'dotenv';
config();

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
            return res.status(400).json({ error: "Missing required payment details." });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
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

            res.status(200).json({ success: true, message: "Payment verified successfully." });
        } else {
            res.status(400).json({ success: false, error: "Invalid payment signature." });
        }

    } catch (error: any) {
        console.error("Payment verification error:", error);
        res.status(500).json({ error: 'Failed to verify payment.' });
    }
}
