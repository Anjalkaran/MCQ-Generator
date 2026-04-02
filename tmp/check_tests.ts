
import { db } from './src/lib/firebase-admin';

async function check() {
    try {
        const tests = await db.collection('live_tests').get();
        console.log("Total tests:", tests.size);
        tests.docs.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}, Title: ${data.title}, Type: ${data.type}, Categories: ${JSON.stringify(data.examCategories)}`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
