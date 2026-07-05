import Razorpay from 'razorpay';

const key_id = 'rzp_test_T4Jr1Nbq45cMcX';
const key_secret = 'VmpmCyuN5K55DuMjEH06xosg';

console.log('Testing new keys...');
console.log('Key ID:', key_id);

const r = new Razorpay({ key_id, key_secret });

r.orders.create({
    amount: 100,
    currency: 'INR',
    receipt: 'test_receipt'
}).then(order => {
    console.log('SUCCESS! Order created:', order.id);
}).catch(err => {
    console.error('FAILED:', JSON.stringify(err, null, 2));
});
