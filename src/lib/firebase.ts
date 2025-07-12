import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
    if (!firebaseConfig.apiKey) {
        // This check is primarily for server-side operations where env vars are critical.
        // The error will be caught and handled in the action files.
        return null;
    }
    return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

function getFirebaseAuth() {
    const app = getFirebaseApp();
    return app ? getAuth(app) : null;
}

function getFirebaseDb() {
    const app = getFirebaseApp();
    return app ? getFirestore(app) : null;
}


export { getFirebaseApp, getFirebaseAuth, getFirebaseDb };
