
import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Correctly import the service account JSON.
// The `as admin.ServiceAccount` assertion is crucial for type safety.
import serviceAccount from '../../service-account.json';

// This ensures that initialization only happens once.
const adminApp = !getApps().length
  ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: 'quizwiz-be479.appspot.com',
    })
  : getApps()[0];

const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();
const adminStorage = adminApp.storage();

export { adminAuth, adminDb, adminStorage };
