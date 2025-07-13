
import { config } from 'dotenv';
config();

import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }

        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = userDoc.data();
        const examCategory = userData?.examCategory;

        if (!examCategory) {
            return res.status(400).json({ error: 'User exam category not set.' });
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

        res.status(200).json(order);

    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
}
