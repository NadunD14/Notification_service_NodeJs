// Backend/generateVapidKeys.js

const webPush = require('web-push');
const vapidKeys = webPush.generateVAPIDKeys();

console.log('VAPID Keys Generated:');
console.log(vapidKeys);
console.log('\nCopy these keys to your .env file:');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
