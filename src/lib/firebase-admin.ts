
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin SDK credentials are not set in the environment variables.');
    return null as any; 
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
    console.log("Firebase Admin SDK initialized successfully with Storage Bucket.");
    return app;
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    throw new Error('Failed to initialize Firebase Admin SDK. Check server logs.');
  }
}

const adminApp = initializeAdminApp();
const adminAuth = adminApp ? admin.auth(adminApp) : null;
const adminDb = adminApp ? admin.firestore(adminApp) : null;
const adminStorage = adminApp ? admin.storage() : null;


export { adminAuth, adminDb, adminStorage };
