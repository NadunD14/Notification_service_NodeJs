// src/config/webpush.js

const webpush = require('web-push');
require('dotenv').config();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
    console.error('VAPID keys are not set. Generate them with npm run generate-keys and put them in .env');
    throw new Error('Missing VAPID keys');
}

webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'example@yourdomain.com'}`,
    publicKey,
    privateKey
);

module.exports = webpush;
module.exports.VAPID_PUBLIC_KEY = publicKey;
