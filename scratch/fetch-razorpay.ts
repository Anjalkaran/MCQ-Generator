import Razorpay from 'razorpay';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_T2lZIXOSc8dXuA';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'qwc68Pt1Ra8f1AswPWFJ842I';

console.log('Using Razorpay Key:', key_id);
const r = new Razorpay({ key_id, key_secret });

async function run() {
  console.log('Fetching last 20 payments from Razorpay...');
  const payments = await r.payments.all({ count: 20 });
  
  console.log(`Fetched ${payments.items.length} payments:`);
  for (const p of payments.items) {
    console.log(`- ID: ${p.id}, Amount: ${p.amount / 100} INR, Status: ${p.status}, Email: ${p.email}, Phone: ${p.contact}, Created At: ${new Date(p.created_at * 1000).toLocaleString('en-IN')}`);
  }

  console.log('\nSearching for krishk8460@gmail.com or phone 8807438063 in last 100 payments...');
  const morePayments = await r.payments.all({ count: 100 });
  const matched = morePayments.items.filter(p => 
    p.email?.toLowerCase().includes('krishk8460') || 
    p.contact?.includes('8807438063')
  );

  if (matched.length === 0) {
    console.log('No matched payments found in last 100 payments.');
  } else {
    console.log('MATCHED PAYMENTS:');
    matched.forEach(p => {
      console.log(JSON.stringify(p, null, 2));
    });
  }
}

run().catch(console.error);
