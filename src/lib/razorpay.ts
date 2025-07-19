
import Razorpay from 'razorpay';

// WARNING: This is a temporary solution to bypass environment variable issues.
// For production, it is strongly recommended to use a secure secret management system.
const RAZORPAY_KEY_ID = "rzp_test_H9BcFtFwY7XIZb";
const RAZORPAY_KEY_SECRET = "1u6q7RNwQYHsgbgc6E5afW89";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    // This check is kept for safety, but should not be triggered with hardcoded keys.
    console.warn('Razorpay keys are not configured properly.');
}

export const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});
