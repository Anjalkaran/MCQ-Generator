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

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Check if all necessary environment variables are set.
const firebaseConfigIsValid =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

if (typeof window !== 'undefined' && firebaseConfigIsValid) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
}

function getFirebaseAuth(): Auth | null {
    if (firebaseConfigIsValid) {
        if (!auth) {
             if (!getApps().length) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            auth = getAuth(app);
        }
        return auth;
    }
    return null;
}

function getFirebaseDb(): Firestore | null {
    if (firebaseConfigIsValid) {
        if (!db) {
            if (!getApps().length) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            db = getFirestore(app);
        }
        return db;
    }
    return null;
}

export { getFirebaseAuth, getFirebaseDb };
