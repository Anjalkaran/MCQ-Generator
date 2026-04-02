import { getFirebaseDb } from '../src/lib/firebase-admin';

async function run() {
    try {
        const db = getFirebaseDb();
        console.log('--- WEEKLY TESTS ---');
        const weeklySnap = await db.collection('weeklyTests').limit(5).get();
        weeklySnap.docs.forEach(doc => console.log('ID:', doc.id, 'Title:', doc.data().title, 'QPID:', doc.data().questionPaperId));
        
        console.log('--- DAILY TESTS ---');
        const dailySnap = await db.collection('dailyTests').limit(5).get();
        dailySnap.docs.forEach(doc => console.log('ID:', doc.id, 'Title:', doc.data().title, 'QPID:', doc.data().questionPaperId));

        console.log('--- LIVE TESTS ---');
        const liveSnap = await db.collection('live_tests').limit(5).get();
        liveSnap.docs.forEach(doc => console.log('ID:', doc.id, 'Title:', doc.data().title, 'QPID:', doc.data().questionPaperId));
    } catch (e) {
        console.error('Error:', e);
    }
}
run().catch(console.error);
