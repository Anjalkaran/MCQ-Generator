
export const ADMIN_EMAILS = ["admin@anjalkaran.com", "raamamoorthy@gmail.com"];
export const FREE_EXAM_LIMIT = 0;

// This key is safe to expose on the client-side
export const RAZORPAY_KEY_ID = "rzp_live_XNruThYCl1M0Gu";
// This secret is used for creating orders and should only be on the server.
export const RAZORPAY_KEY_SECRET = "bgLP1VBRdSQ8ZUnpkcUdhriI";
// The webhook secret is loaded directly via process.env in the webhook API route
// to avoid issues with serverless function environments.
export const RAZORPAY_WEBHOOK_SECRET = "Nanaadheera@2324";
