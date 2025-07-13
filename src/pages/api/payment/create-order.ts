
import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';
import { getUserData } from '@/lib/firestore';
import { config } from 'dotenv';

// Explicitly load environment variables
config({ path: '.env.local' });

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
    throw new Error("Razorpay API keys are not configured in environment variables.");
}

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
});

const getAmountInPaise = (examCategory: 'MTS' | 'POSTMAN' | 'PA'): number => {
    if (examCategory === 'PA') {
        return 749 * 100; // Rs. 749.00
    }
    return 499 * 100; // Rs. 499.00
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const userData = await getUserData(userId);
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if the user is already paid and their subscription is still valid
        const isPaidAndActive = userData.paymentStatus === 'paid' && userData.paidUntil && new Date(userData.paidUntil) > new Date();
        if (isPaidAndActive) {
            return res.status(400).json({ error: 'User already has an active subscription.' });
        }

        const amount = getAmountInPaise(userData.examCategory);
        const options = {
            amount,
            currency: 'INR',
            receipt: `receipt_user_${userId}_${new Date().getTime()}`,
            payment_capture: 1
        };

        const response = await razorpay.orders.create(options);
        
        return res.status(200).json({
            id: response.id,
            currency: response.currency,
            amount: response.amount
        });

    } catch (error: any) {
        console.error('Error creating Razorpay order:', error);
        return res.status(500).json({ error: error.message || 'Something went wrong' });
    }
}
