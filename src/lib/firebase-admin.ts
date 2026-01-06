
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';
import serviceAccount from '../../service-account.json';

const serviceAccountConfig = {
  projectId: serviceAccount.project_id,
  clientEmail: serviceAccount.client_email,
  privateKey: serviceAccount.private_key,
};

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountConfig),
      storageBucket: "quizwiz-be479.appspot.com",
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    return null as any;
  }
}

const adminApp = initializeAdminApp();
const adminAuth = adminApp ? admin.auth(adminApp) : null;
const adminDb = adminApp ? admin.firestore(adminApp) : null;
const adminStorage = adminApp ? admin.storage() : null;

export { adminAuth, adminDb, adminStorage };
