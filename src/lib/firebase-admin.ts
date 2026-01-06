
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';

const firebaseConfig = {
  apiKey: "AIzaSyCgHVZAjOL5p2i_CJNY4MOvj6h8RjSg-Bc",
  authDomain: "quizwiz-be479.firebaseapp.com",
  projectId: "quizwiz-be479",
  storageBucket: "quizwiz-be479.appspot.com",
  messagingSenderId: "750766638065",
  appId: "1:750766638065:web:f3bdcc38ca89a7e9e53a50"
};

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Use a service account for admin initialization if available
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: clientEmail,
        privateKey: privateKey
      }),
      storageBucket: firebaseConfig.storageBucket, // Explicitly set the storage bucket
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
