const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // I'll check if this exists or use default

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://anjalkaran-53942.firebaseio.com"
    });
}
const db = admin.firestore();

async function run() {
    console.log('Fetching mcqHistory...');
    const snap = await db.collection('mcqHistory').orderBy('takenAt', 'desc').limit(10).get();
    console.log('Found', snap.size, 'docs');
    snap.docs.forEach(doc => {
        const d = doc.data();
        console.log({
            id: doc.id,
            userId: d.userId,
            liveTestId: d.liveTestId,
            weeklyTestId: d.weeklyTestId,
            dailyTestId: d.dailyTestId,
            topicTitle: d.topicTitle
        });
    });
}
run();
