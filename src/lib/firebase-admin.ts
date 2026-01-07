import * as admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
    try {
        // Since environment variables are not consistently available in this environment,
        // we embed the service account directly.
        app = admin.initializeApp({
            credential: admin.credential.cert({
                "projectId": "quizwiz-be479",
                "privateKey": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
                "clientEmail": "firebase-adminsdk-q93g6@quizwiz-be479.iam.gserviceaccount.com"
            }),
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
