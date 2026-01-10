
import * as admin from 'firebase-admin';

// This is a placeholder service account. In a real production environment,
// you would use a secure way to load your service account credentials.
const serviceAccount = {
  "type": "service_account",
  "project_id": "quizwiz-be479",
  "private_key_id": "d1e2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----\\n",
  "client_email": "firebase-adminsdk-xxxxx@quizwiz-be479.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40quizwiz-be479.iam.gserviceaccount.com"
};

function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
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
