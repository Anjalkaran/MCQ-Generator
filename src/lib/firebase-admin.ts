
import * as admin from 'firebase-admin';

let isInitialized = false;

/**
 * Ensures the Firebase Admin SDK is initialized exactly once.
 * Falls back through service account key, default credentials, and basic project config.
 */
export function initializeFirebaseAdmin() {
    if (isInitialized || admin.apps.length > 0) {
        isInitialized = true;
        return admin;
    }

    try {
        let serviceAccount;
        try {
            serviceAccount = require('./serviceAccountKey.json');
        } catch (e) {
            // Ignore missing file - will use defaults
        }

        if (serviceAccount && Object.keys(serviceAccount).length > 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as any),
                storageBucket: 'quizwiz-be479.appspot.com'
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                storageBucket: 'quizwiz-be479.appspot.com'
            });
        }
    } catch (e) {
        // Last-ditch effort: Initialize with empty config if on GCP
        try {
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    storageBucket: 'quizwiz-be479.appspot.com'
                });
            }
        } catch (innerError) {
            // Don't rethrow, let the specific service call fail with a better error message if init truly failed
        }
    }

    isInitialized = true;
    return admin;
}

// Export the initialized instance
const initializedAdmin = initializeFirebaseAdmin();
export { initializedAdmin as admin };

export const getFirebaseDb = () => {
    return initializeFirebaseAdmin().firestore();
}

export const getFirebaseStorage = () => {
    return initializeFirebaseAdmin().storage();
}

export const getFirebaseAuth = () => {
    return initializeFirebaseAdmin().auth();
}

