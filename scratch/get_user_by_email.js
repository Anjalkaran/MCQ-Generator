const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = "c:\\Users\\shanm\\Downloads\\Anjalkaran\\src\\lib\\serviceAccountKey.json";
let serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const email = 'kholiking952@gmail.com';
  const snapshot = await db.collection('users').where('email', '==', email).get();
  
  if (snapshot.empty) {
    console.log('No user found with email:', email);
    return;
  }
  
  snapshot.forEach(doc => {
    console.log('Document ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
    console.log('CreateTime:', doc.createTime.toDate());
    console.log('UpdateTime:', doc.updateTime.toDate());
  });
}

main().catch(console.error);
