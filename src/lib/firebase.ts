import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("Firebase config is missing. Make sure NEXT_PUBLIC_FIREBASE_* environment variables are set.");
        return null;
    }
    return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseAuth(): Auth | null {
    const app = getFirebaseApp();
    return app ? getAuth(app) : null;
}

function getFirebaseDb(): Firestore | null {
    const app = getFirebaseApp();
    return app ? getFirestore(app) : null;
}

export { getFirebaseAuth, getFirebaseDb };
