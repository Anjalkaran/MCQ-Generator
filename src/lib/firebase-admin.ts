
import * as admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        storageBucket: 'quizwiz-be479.appspot.com'
      });
      console.log('Firebase Admin SDK Initialized.');
    } catch (e) {
      console.error('Firebase Admin Initialization Error', e);
    }
  }
}

initializeFirebaseAdmin();

export const getFirebaseDb = () => {
    if (admin.apps.length === 0) {
        initializeFirebaseAdmin();
    }
    return admin.firestore();
}

export const getFirebaseStorage = () => {
    if (admin.apps.length === 0) {
        initializeFirebaseAdmin();
    }
    return admin.storage();
}
