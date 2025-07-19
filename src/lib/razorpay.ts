
import Razorpay from 'razorpay';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from './constants';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    // This check runs at build time and might not catch runtime errors if the server isn't restarted.
    // The main protection is now in the API route itself.
    console.warn('Razorpay keys are not configured properly. Please check your .env file and restart the server.');
}

export const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});
