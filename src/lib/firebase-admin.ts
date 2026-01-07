
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';

// Correctly import the service account JSON.
// The `as admin.ServiceAccount` assertion is crucial for type safety.
import serviceAccount from '../../service-account.json';

let adminApp: App | undefined;

// This ensures that initialization only happens once.
if (!getApps().length) {
  try {
    // Assert the type of the imported service account.
    const serviceAccountConfig = serviceAccount as admin.ServiceAccount;

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountConfig),
      storageBucket: 'quizwiz-be479.appspot.com',
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // In a real production environment, you might handle this more gracefully.
    // For now, we log the error to make it visible.
  }
} else {
  adminApp = getApps()[0];
}

// Export the initialized services. Using a ternary operator handles the case where initialization might have failed.
const adminAuth = adminApp ? admin.auth() : null;
const adminDb = adminApp ? admin.firestore() : null;
const adminStorage = adminApp ? admin.storage() : null;

export { adminAuth, adminDb, adminStorage };
