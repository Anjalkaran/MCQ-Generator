
import * as admin from 'firebase-admin';
import { getApps, cert, App } from 'firebase-admin/app';
// @ts-ignore - TSC will complain about this path, but it's valid for Next.js
import serviceAccount from './serviceAccountKey.json';

let adminApp: App | undefined;

if (getApps().length === 0) {
  try {
    // Ensure all required fields for the service account are present
    if (
      serviceAccount.project_id &&
      serviceAccount.private_key &&
      serviceAccount.client_email
    ) {
      adminApp = admin.initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } else {
      console.error('Service account key is missing required fields.');
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
  }
} else {
  adminApp = getApps()[0];
}

const getAdminAuth = (): admin.auth.Auth => {
    if (!adminApp) {
        throw new Error("Firebase Admin App is not initialized. Cannot get Auth service.");
    }
    return admin.auth(adminApp);
}

const getAdminDb = (): admin.firestore.Firestore => {
    if (!adminApp) {
        throw new Error("Firebase Admin App is not initialized. Cannot get Firestore service.");
    }
    return admin.firestore(adminApp);
}

export { getAdminAuth as adminAuth, getAdminDb as adminDb };
