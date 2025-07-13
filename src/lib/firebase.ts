import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCgHVZAjOL5p2i_CJNY4MOvj6h8RjSg-Bc",
  authDomain: "quizwiz-be479.firebaseapp.com",
  projectId: "quizwiz-be479",
  storageBucket: "quizwiz-be479.appspot.com",
  messagingSenderId: "750766638065",
  appId: "1:750766638065:web:f3bdcc38ca89a7e9e53a50"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    return;
  }
  
  const firebaseConfigIsValid =
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId;

  if (firebaseConfigIsValid) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e) {
        console.error("Error initializing Firebase", e);
    }
  } else {
    console.error("Firebase configuration is invalid.");
  }
}

function getFirebaseAuth(): Auth | null {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

function getFirebaseDb(): Firestore | null {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

export { getFirebaseAuth, getFirebaseDb };
