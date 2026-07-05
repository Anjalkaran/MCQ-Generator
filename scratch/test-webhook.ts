import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/payment/webhook/route';
import { RAZORPAY_WEBHOOK_SECRET } from '../src/lib/constants';

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
  console.log(`Setting user ${uid} to isPro: false for testing...`);
  
  const userRef = db.collection('users').doc(uid);
  await userRef.update({
    isPro: false,
    proValidUntil: null,
    subscribedCategory: admin.firestore.FieldValue.delete()
  });

  // Construct payload
  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_mockTest12345',
          amount: 9900,
          contact: '+919344802309',
          notes: {
            planType: 'postman_monthly',
            userId: uid
          }
        }
      }
    }
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  console.log('Generated Webhook Signature:', signature);
  console.log('Sending mock Webhook request...');

  // Mock NextRequest
  const req = new NextRequest('http://localhost:3000/api/payment/webhook', {
    method: 'POST',
    headers: {
      'x-razorpay-signature': signature,
      'content-type': 'application/json'
    },
    body: rawBody
  });

  const response = await POST(req);
  console.log('Webhook Response Status:', response.status);
  const resBody = await response.json();
  console.log('Webhook Response Body:', resBody);

  // Check user status
  const snap = await userRef.get();
  const userData = snap.data();
  console.log('\nUpdated User Data in Firestore:', {
    uid: userData?.uid,
    isPro: userData?.isPro,
    proValidUntil: userData?.proValidUntil?.toDate(),
    subscribedCategory: userData?.subscribedCategory,
    phone: userData?.phone
  });

  if (userData?.isPro === true && userData?.subscribedCategory === 'POSTMAN' && userData?.phone === '9344802309') {
    console.log('\nSUCCESS: Webhook correctly upgraded user to Pro and set subscribedCategory/phone.');
  } else {
    console.error('\nFAILURE: Webhook did not update user correctly.');
  }
}

run().catch(console.error);
