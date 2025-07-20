
import * as admin from 'firebase-admin';
import { getApps, cert, App } from 'firebase-admin/app';
// @ts-ignore - TSC will complain about this path, but it's valid for Next.js
import serviceAccount from './serviceAccountKey.json';

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    if (
      !serviceAccount.project_id ||
      !serviceAccount.private_key ||
      !serviceAccount.client_email
    ) {
      throw new Error('Service account key is missing required fields.');
    }

    const app = admin.initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    throw new Error('Failed to initialize Firebase Admin SDK. Check server logs.');
  }
}

const adminApp = initializeAdminApp();
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminAuth, adminDb };
