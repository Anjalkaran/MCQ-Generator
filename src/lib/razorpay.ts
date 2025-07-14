
import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured in environment variables. Cannot initialize Razorpay instance.');
}

export const razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

export const razorpayKeySecret = keySecret;
