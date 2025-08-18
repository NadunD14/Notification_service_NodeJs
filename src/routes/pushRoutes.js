// src/routes/pushRoutes.js

const express = require('express');
const router = express.Router();
const webpush = require('../config/webpush');
const store = require('../services/subscriptionStore');

// Subscribe endpoint
router.post('/subscribe', (req, res) => {
    const subscription = req.body;
    const added = store.add(subscription);
    res.status(200).json({ message: added ? 'Subscription saved' : 'Subscription already exists' });
});

// Unsubscribe endpoint
router.post('/unsubscribe', (req, res) => {
    const removed = store.remove(req.body);
    res.status(200).json({ message: removed ? 'Subscription removed' : 'Subscription not found' });
});

// Send test notification to all or a specific user
router.post('/send', async (req, res) => {
    const { title, body, userId } = req.body;
    const subs = userId ? store.byUser(userId) : store.all();
    if (subs.length === 0) return res.status(404).json({ message: 'No subscriptions found' });

    const payload = JSON.stringify({
        title: title || 'New Notification',
        body: body || 'You have a new notification'
    });

    let sent = 0; let failed = 0;
    await Promise.all(subs.map(async sub => {
        try {
            await webpush.sendNotification(sub, payload);
            sent++;
        } catch (err) {
            failed++;
            if (err.statusCode === 410) {
                store.remove(sub); // prune invalid
            }
            console.error('Error sending notification:', err.statusCode, err.body || err.message);
        }
    }));

    res.status(200).json({ message: 'Send attempt complete', successful: sent, failed });
});

// Public VAPID key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
