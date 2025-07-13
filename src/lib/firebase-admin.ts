
import * as admin from 'firebase-admin';
import { config } from 'dotenv';

// Explicitly load environment variables from .env.local
config({ path: '.env.local' });

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set or empty.");
    }
    const serviceAccount = JSON.parse(serviceAccountString);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    adminAuth = admin.auth();
    adminDb = admin.firestore();

  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    // To prevent the app from using uninitialized services, we'll throw
    // This will cause API routes to fail gracefully if setup is incorrect.
    throw new Error("Firebase Admin SDK failed to initialize. Check server logs and FIREBASE_SERVICE_ACCOUNT environment variable.");
  }
} else {
    // If already initialized, get the existing instances
    adminAuth = admin.auth();
    adminDb = admin.firestore();
}

export { adminAuth, adminDb };
