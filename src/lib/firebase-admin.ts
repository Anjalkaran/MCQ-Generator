
import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;

if (!admin.apps.length) {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountString) {
        try {
            const serviceAccount = JSON.parse(serviceAccountString);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            
            adminAuth = admin.auth();
            adminDb = admin.firestore();
            console.log("Firebase Admin SDK initialized successfully.");

        } catch (error: any) {
            console.error('Firebase Admin SDK initialization error:', 'Failed to parse or use the service account. Please ensure it is a valid JSON string.', error.message);
        }
    } else {
        console.warn('Firebase Admin SDK is not initialized. The FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin-only features will not be available.');
    }
} else {
    // If already initialized, get the existing instances
    if (admin.apps[0]) {
        adminAuth = admin.auth(admin.apps[0]);
        adminDb = admin.firestore(admin.apps[0]);
    }
}

// A function to get the DB instance that throws a clear error if not initialized
const getAdminDb = () => {
    if (!adminDb) {
        throw new Error("Firebase Admin SDK is not available. Please configure the FIREBASE_SERVICE_ACCOUNT environment variable.");
    }
    return adminDb;
}

export { adminAuth, getAdminDb as adminDb };
