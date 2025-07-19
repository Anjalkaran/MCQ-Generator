
import * as admin from 'firebase-admin';
import { getApps, cert } from 'firebase-admin/app';
// @ts-ignore - TSC will complain about this path, but it's valid for Next.js
import serviceAccount from './serviceAccountKey.json';

let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;

if (getApps().length === 0) {
    try {
        admin.initializeApp({
            credential: cert(serviceAccount),
        });
        
        adminAuth = admin.auth();
        adminDb = admin.firestore();
        console.log("Firebase Admin SDK initialized successfully.");

    } catch (error: any)
    {
        console.error('Firebase Admin SDK initialization error:', error.message);
    }
} else {
    if (admin.apps[0]) {
        adminAuth = admin.auth(admin.apps[0]);
        adminDb = admin.firestore(admin.apps[0]);
    }
}

const getAdminDb = () => {
    if (!adminDb) {
        throw new Error("Firebase Admin SDK is not available. Initialization may have failed.");
    }
    return adminDb;
}

export { adminAuth, getAdminDb as adminDb };
