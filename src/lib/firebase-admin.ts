
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // These environment variables are configured in your hosting environment
  // (e.g., Vercel, Firebase App Hosting).
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // The private key needs to have its newline characters correctly formatted.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    const errorMessage = 'Firebase Admin SDK credentials are not set in the environment variables. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.';
    console.error(errorMessage);
    // In a real app, you might throw an error or handle this case differently,
    // but for now, we prevent the app from crashing during initialization.
    // The API routes using adminDb/adminAuth will fail gracefully.
    return null as any; 
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    throw new Error('Failed to initialize Firebase Admin SDK. Check server logs.');
  }
}

const adminApp = initializeAdminApp();
const adminAuth = adminApp ? admin.auth(adminApp) : null;
const adminDb = adminApp ? admin.firestore(adminApp) : null;

export { adminAuth, adminDb };
