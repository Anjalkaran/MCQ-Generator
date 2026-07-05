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
  const uid = 'x6fHSIa0JBfektRRHiV8WJfv1fh1';
  console.log(`Fixing Pro status for user UID: ${uid}`);

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    console.log('User document does not exist!');
    return;
  }

  // Calculate validity: 1 month from June 22, 2026
  // Payment was on 22/06/2026, so valid until 22/07/2026
  const proValidUntil = new Date('2026-07-22T20:22:45.000Z');

  await userRef.update({
    isPro: true,
    proValidUntil: admin.firestore.Timestamp.fromDate(proValidUntil),
    subscribedCategory: 'POSTMAN',
    phone: '9344802309', // update to the phone number they paid with
  });

  // Create notification
  await db.collection('notifications').add({
    userId: uid,
    userName: snap.data()?.name || 'Thamarai kani',
    message: `${snap.data()?.name || 'Thamarai kani'} Pro status was restored manually after payment verification.`,
    createdAt: new Date(),
    isRead: false
  });

  const updatedSnap = await userRef.get();
  console.log('Successfully updated user document. New data:', updatedSnap.data());
}

run().catch(console.error);
