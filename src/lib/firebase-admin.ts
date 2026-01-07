
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';
import serviceAccount from '../../service-account.json';

let adminApp: App;

if (getApps().length === 0) {
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: 'quizwiz-be479.appspot.com',
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // If initialization fails, we'll throw to prevent the app from running with a broken config.
    throw new Error('Firebase Admin SDK could not be initialized.');
  }
} else {
  adminApp = getApps()[0];
}

const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);
const adminStorage = admin.storage(adminApp);

export { adminAuth, adminDb, adminStorage };
