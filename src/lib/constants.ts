

export const ADMIN_EMAILS = ["admin@anjalkaran.com", "raamamoorthy@gmail.com"];
export const FREE_EXAM_LIMIT = 5;

// This key is safe to expose on the client-side
export const RAZORPAY_KEY_ID = "rzp_test_H9BcFtFwY7XIZb";
// This secret is used for creating orders and should only be on the server.
export const RAZORPAY_KEY_SECRET = "1u6q7RNwQYHsgbgc6E5afW89";
// The webhook secret is loaded directly via process.env in the webhook API route
// to avoid issues with serverless function environments.
export const RAZORPAY_WEBHOOK_SECRET = "Nanaadheera@2324";
