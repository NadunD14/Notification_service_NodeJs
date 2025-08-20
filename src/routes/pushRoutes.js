// src/routes/pushRoutes.js

const express = require('express');
const router = express.Router();
const webpush = require('../config/webpush');
const { v4: uuidv4 } = require('uuid');
const Subscription = require('../models/Subscription');
const { verifyToken } = require('../utils/tokenVerification');

function normalizeSubscriptionPayload(body) {
    // Expect either full Web Push subscription or { subscription: {...}, userId }
    if (!body) return null;
    const sub = body.endpoint ? body : body.subscription;
    if (!sub || !sub.endpoint || !sub.keys) return null;
    return sub;
}

// Subscribe (persist to MongoDB)
router.post('/subscribe', async (req, res) => {
    try {
        const decoded = verifyToken(req, { required: false });
        req.user = decoded;

        console.log('Authenticated user:', req.user);
        console.log('User sub field:', req.user?.sub);

        // Extract userId from the token - 'sub' field typically contains the user ID
        const userId = req.user?.sub || req.user?.userId || req.user?.id;
        console.log('Extracted userId:', userId);

        const subscription = normalizeSubscriptionPayload(req.body);
        console.log('Subscription payload:', req.body);
        if (!subscription) {
            return res.status(400).json({ message: 'Invalid subscription payload' });
        }

        const item = await Subscription.create({
            subscriptionId: uuidv4(),
            userId: userId || 'ANONYMOUS',
            subscription
        });

        console.log('Created subscription with userId:', userId || 'ANONYMOUS');
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
        await Subscription.deleteOne({ subscriptionId });
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
            subs = await Subscription.find({ userId }).lean();
        } else {
            subs = await Subscription.find({}).limit(500).lean();
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
                if (sub.subscription && typeof sub.subscription === 'object') {
                    pushSub = sub.subscription;
                } else {
                    malformed++; throw new Error('Invalid subscription format');
                }
                await webpush.sendNotification(pushSub, payload);
                sent++;
            } catch (err) {
                failed++;
                if (err.statusCode === 410 && sub.subscriptionId) {
                    await Subscription.deleteOne({ subscriptionId: sub.subscriptionId });
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
