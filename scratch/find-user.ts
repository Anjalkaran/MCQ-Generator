import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

const db = admin.firestore();

async function run() {
  const targetUid = 'x6fHSIa0JBfektRRHiV8WJfv1fh1';
  console.log(`Searching notifications for userId: ${targetUid}`);

  const snap = await db.collection('notifications')
    .where('userId', '==', targetUid)
    .get();

  if (snap.empty) {
    console.log('No notifications found for this user ID.');
  } else {
    snap.forEach(doc => {
      console.log('Notification found:', doc.id, doc.data());
    });
  }
}

run().catch(console.error);
