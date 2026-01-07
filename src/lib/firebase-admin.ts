import * as admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
    try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountString) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
        }
        const serviceAccount = JSON.parse(serviceAccountString);

        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: 'quizwiz-be479.appspot.com'
        });
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
    }
} else {
    app = admin.apps[0]!;
}

export const adminDb = app ? app.firestore() : undefined;
export const adminStorage = app ? app.storage() : undefined;
export const adminAuth = app ? app.auth() : undefined;
