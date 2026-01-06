
import * as admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';
import serviceAccount from '../../service-account.json';

// Type assertion to satisfy the credential structure
const sa = serviceAccount as {
    projectId: string;
    clientEmail: string;
    privateKey: string;
};

let adminApp: App | null = null;
if (getApps().length === 0) {
    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(sa),
            storageBucket: "quizwiz-be479.appspot.com",
        });
        console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
        console.error('Firebase Admin SDK initialization error:', error.message);
    }
} else {
    adminApp = getApps()[0];
}

const adminAuth = adminApp ? admin.auth(adminApp) : null;
const adminDb = adminApp ? admin.firestore(adminApp) : null;
const adminStorage = adminApp ? admin.storage() : null;

export { adminAuth, adminDb, adminStorage };
