// src/routes/pushRoutes.js

const express = require('express');
const router = express.Router();
const webpush = require('../config/webpush');
const dynamoHelpers = require('../utils/dynamoHelpers');
const { v4: uuidv4 } = require('uuid');

const SUBSCRIPTIONS_TABLE = 'Subscriptions';

function normalizeSubscriptionPayload(body) {
    // Expect either full Web Push subscription or { subscription: {...}, userId }
    if (!body) return null;
    const sub = body.endpoint ? body : body.subscription;
    if (!sub || !sub.endpoint || !sub.keys) return null;
    return sub;
}

// Subscribe (persist to DynamoDB)
router.post('/subscribe', async (req, res) => {
    try {
        const { userId } = req.body; // optional user association
        const subscription = normalizeSubscriptionPayload(req.body);
        if (!subscription) {
            return res.status(400).json({ message: 'Invalid subscription payload' });
        }

        // Check for existing identical subscription for same user
        // Since we don't have a direct endpoint index, we store blindly; dedupe can be improved
        const item = {
            subscriptionId: uuidv4(),
            userId: userId || 'ANONYMOUS',
            subscription: JSON.stringify(subscription)
        };
        await dynamoHelpers.createItem(SUBSCRIPTIONS_TABLE, item);
        return res.status(200).json({ message: 'Subscription saved', subscriptionId: item.subscriptionId });
    } catch (error) {
        console.error('Error saving subscription:', error);
        return res.status(500).json({ message: 'Failed to save subscription', error: error.message });
    }
});

// Unsubscribe by subscriptionId
router.post('/unsubscribe', async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        if (!subscriptionId) return res.status(400).json({ message: 'subscriptionId is required' });
        await dynamoHelpers.deleteItem(SUBSCRIPTIONS_TABLE, { subscriptionId });
        return res.status(200).json({ message: 'Subscription removed (if existed)' });
    } catch (error) {
        console.error('Error removing subscription:', error);
        return res.status(500).json({ message: 'Failed to remove subscription', error: error.message });
    }
});

// Send test notification to all or a specific user
router.post('/send', async (req, res) => {
    const { title, body, userId } = req.body;
    try {
        let subs;
        if (userId) {
            // query subscriptions by userId index
            subs = await dynamoHelpers.queryItems(
                SUBSCRIPTIONS_TABLE,
                'userId-index',
                'userId = :userId',
                { ':userId': userId }
            );
        } else {
            subs = await dynamoHelpers.listItems(SUBSCRIPTIONS_TABLE, { limit: 500 });
        }
        if (!subs || subs.length === 0) return res.status(404).json({ message: 'No subscriptions found' });

        const payload = JSON.stringify({
            title: title || 'New Notification',
            body: body || 'You have a new notification'
        });

        let sent = 0; let failed = 0; let malformed = 0;
        await Promise.all(subs.map(async sub => {
            try {
                let pushSub;
                if (sub.endpoint) {
                    pushSub = sub;
                } else if (sub.subscription) {
                    let raw = sub.subscription;
                    if (typeof raw === 'string') {
                        try { pushSub = JSON.parse(raw); } catch (e) { malformed++; throw new Error('Malformed subscription JSON'); }
                    } else { pushSub = raw; }
                } else {
                    malformed++; throw new Error('Invalid subscription format');
                }
                await webpush.sendNotification(pushSub, payload);
                sent++;
            } catch (err) {
                failed++;
                if (err.statusCode === 410 && sub.subscriptionId) {
                    await dynamoHelpers.deleteItem(SUBSCRIPTIONS_TABLE, { subscriptionId: sub.subscriptionId });
                }
                console.error('Error sending notification:', err.statusCode, err.body || err.message);
            }
        }));

        res.status(200).json({ message: 'Send attempt complete', successful: sent, failed, malformed });
    } catch (error) {
        console.error('Error in send test:', error);
        res.status(500).json({ message: 'Failed to send test notifications', error: error.message });
    }
});

// Public VAPID key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
