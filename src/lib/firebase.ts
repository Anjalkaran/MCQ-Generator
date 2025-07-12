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

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);


function getFirebaseApp(): FirebaseApp | null {
    if (!firebaseConfig.apiKey) {
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


export { getFirebaseAuth, getFirebaseDb };
