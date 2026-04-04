
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
        let serviceAccount: any = null;
        
        // 1. Try environment variables first (usually set in staging/prod or .env.local)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
           try {
               serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
           } catch(e) {}
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            };
        }

        // 2. Fallback to serviceAccountKey.json file if env vars missing
        if (!serviceAccount) {
            try {
                // Using dynamic require with try-catch
                serviceAccount = require('./serviceAccountKey.json');
            } catch (e) {
                // Fallback for different build environments
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const filePath = path.join(process.cwd(), 'src', 'lib', 'serviceAccountKey.json');
                    if (fs.existsSync(filePath)) {
                        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    }
                } catch (innerE) {}
            }
        }

        if (serviceAccount && (serviceAccount.projectId || serviceAccount.project_id)) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'quizwiz-be479.appspot.com'
            });
        } else {
            // Default initialization (works automatically if running on GCP/Firebase)
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'quizwiz-be479.appspot.com'
            });
        }
    } catch (e) {
        console.error("Firebase Admin initialization failed:", e);
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

