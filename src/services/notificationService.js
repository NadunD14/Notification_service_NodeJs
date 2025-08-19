// src/services/notificationService.js

const webpush = require('../config/webpush');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');

/**
 * Service for handling notifications
 */
class NotificationService {
    constructor() { }

    /**
     * Get subscriptions by user type, location, and route
     * @param {object} targetCriteria - The targeting criteria
     * @returns {Promise<Array>} - Array of subscriptions
     */
    async getSubscriptionsByTargetCriteria(targetCriteria) {
        const {
            userType,
            province = null,
            city = null,
            route = null
        } = targetCriteria;

        console.log('🎯 Target Criteria:', targetCriteria);

        const query = {};
        if (userType) query.userType = userType; // if null => all
        if (province) query.province = province;
        if (city) query.city = city;
        if (route) query.route = route;

        console.log('🔍 Mongo query for users:', query);

        const users = await User.find(query).lean();

        console.log(`👥 Found ${users?.length || 0} matching users`);

        if (!users || users.length === 0) {
            console.log('❌ No users found matching criteria');
            return [];
        }

        // Get all user IDs
        const userIds = users.map(user => user.userId);
        console.log('📋 User IDs:', userIds);

        const subscriptions = await Subscription.find({ userId: { $in: userIds } }).lean();
        console.log(`📊 Total subscriptions found: ${subscriptions.length}`);
        return subscriptions;
    }

    /**
     * Create and save a notification record
     * @param {object} notificationData - The notification data
     * @returns {Promise<object>} - The created notification
     */
    async createNotification(notificationData) {
        console.log('📝 Creating notification with data:', notificationData);

        const {
            adminId,
            title,
            subject,
            body,
            messageType,
            targetAudience,
            province,
            city,
            route
        } = notificationData;

        const notificationId = uuidv4();

        const notification = {
            notificationId,
            adminId,
            title,
            subject,
            body,
            messageType,
            targetAudience,
            province: province || null,
            city: city || null,
            route: route || null,
            sentAt: new Date().toISOString(),
            stats: {
                totalSent: 0,
                successful: 0,
                failed: 0
            },
            clickCount: 0
        };

        try {
            const created = await Notification.create(notification);
            console.log('✅ Notification created successfully:', notificationId);
            return created.toObject();
        } catch (error) {
            console.error('❌ Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to all matching subscriptions
     * @param {object} notification - The notification object
     * @param {Array} subscriptions - Array of subscription objects
     * @returns {Promise<object>} - Stats about the notification delivery
     */
    async sendNotification(notification, subscriptions) {
        console.log(`🚀 Starting to send notification ${notification.notificationId} to ${subscriptions.length} subscriptions`);

        let successful = 0;
        let failed = 0;

        // Check if webpush is properly configured
        if (!webpush) {
            console.error('❌ WebPush is not properly configured');
            throw new Error('WebPush configuration missing');
        }

        for (let i = 0; i < subscriptions.length; i++) {
            const subscription = subscriptions[i];
            console.log(`📤 Sending notification ${i + 1}/${subscriptions.length} to subscription ${subscription.subscriptionId}`);

            try {
                const payload = {
                    title: notification.title,
                    body: notification.body,
                    subject: notification.subject,
                    messageType: notification.messageType,
                    notificationId: notification.notificationId,
                    url: '/notification/' + notification.notificationId,
                    additionalData: {
                        sentAt: notification.sentAt,
                        targetAudience: notification.targetAudience
                    }
                };

                console.log('📦 Payload:', JSON.stringify(payload, null, 2));

                // Handle different subscription formats
                let pushSubscription;
                if (subscription.endpoint) {
                    // Direct subscription object
                    pushSubscription = subscription;
                } else if (subscription.subscription) {
                    // Check if subscription is already an object
                    if (typeof subscription.subscription === 'object') {
                        pushSubscription = subscription.subscription;
                    } else if (typeof subscription.subscription === 'string') {
                        // Only try to parse if it's actually a string
                        // Check if it's the problematic "[object Object]" string
                        if (subscription.subscription === '[object Object]') {
                            console.error(`❌ Invalid subscription data (object toString) for ${subscription.subscriptionId}`);
                            failed++;
                            continue;
                        }

                        try {
                            pushSubscription = JSON.parse(subscription.subscription);
                        } catch (parseError) {
                            console.error(`❌ Error parsing subscription JSON for ${subscription.subscriptionId}:`, parseError);
                            failed++;
                            continue;
                        }
                    } else {
                        console.error(`❌ Unexpected subscription data type for ${subscription.subscriptionId}: ${typeof subscription.subscription}`);
                        failed++;
                        continue;
                    }
                } else {
                    console.error(`❌ Invalid subscription format for ${subscription.subscriptionId}`);
                    failed++;
                    continue;
                }

                // Validate that we have the required fields
                if (!pushSubscription || !pushSubscription.endpoint) {
                    console.error(`❌ Missing endpoint in subscription for ${subscription.subscriptionId}`);
                    failed++;
                    continue;
                }

                console.log('🔗 Push subscription endpoint:', pushSubscription.endpoint?.substring(0, 50) + '...');

                await webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify(payload)
                );

                successful++;
                console.log(`✅ Successfully sent notification to subscription ${subscription.subscriptionId}`);

            } catch (error) {
                failed++;
                console.error(`❌ Failed to send notification to subscription ${subscription.subscriptionId}:`, {
                    error: error.message,
                    statusCode: error.statusCode,
                    body: error.body
                });

                // Remove invalid subscriptions (410 = Gone)
                if (error.statusCode === 410 && subscription.subscriptionId) {
                    console.log(`🗑️ Removing invalid subscription ${subscription.subscriptionId}`);
                    try {
                        await Subscription.deleteOne({ subscriptionId: subscription.subscriptionId });
                        console.log(`✅ Removed invalid subscription ${subscription.subscriptionId}`);
                    } catch (deleteError) {
                        console.error(`❌ Error removing invalid subscription ${subscription.subscriptionId}:`, deleteError);
                    }
                }
            }
        }

        console.log(`📊 Notification sending complete. Successful: ${successful}, Failed: ${failed}`);

        // Update notification stats
        try {
            await Notification.updateOne(
                { notificationId: notification.notificationId },
                { $set: { 'stats.successful': successful, 'stats.failed': failed, 'stats.totalSent': successful + failed } }
            );
            console.log(`✅ Updated notification stats for ${notification.notificationId}`);
        } catch (error) {
            console.error(`❌ Error updating notification stats:`, error);
        }

        return {
            notificationId: notification.notificationId,
            successful,
            failed,
            totalSent: successful + failed
        };
    }



    /**
     * Process a notification click
     * @param {string} notificationId - The notification ID
     * @returns {Promise<object>} - The updated notification
     */
    async recordNotificationClick(notificationId) {
        try {
            console.log(`🖱️ Recording click for notification ${notificationId}`);
            const result = await Notification.findOneAndUpdate(
                { notificationId },
                { $inc: { clickCount: 1 } },
                { new: true }
            ).lean();
            console.log(`✅ Click recorded for notification ${notificationId}`);
            return result;
        } catch (error) {
            console.error(`❌ Error recording click for notification ${notificationId}:`, error);
            throw error;
        }
    }

    /**
     * Get notification details
     * @param {string} notificationId - The notification ID
     * @returns {Promise<object|null>} - The notification details or null if not found
     */
    async getNotificationDetails(notificationId) {
        try {
            const item = await Notification.findOne({ notificationId }).lean();
            return item || null;
        } catch (error) {
            console.error(`❌ Error getting notification details for ${notificationId}:`, error);
            throw error;
        }
    }

    /**
     * List recent notifications (basic fields) ordered by sentAt descending
     * @param {number} limit
     */
    async listRecentNotifications(limit = 50) {
        try {
            const items = await Notification.find({}, null, { sort: { sentAt: -1 }, limit }).lean();
            return items.map(n => ({
                notificationId: n.notificationId,
                title: n.title,
                content: n.body,
                dateCreated: n.sentAt,
                stats: n.stats
            }));
        } catch (error) {
            console.error('❌ Error listing recent notifications:', error);
            throw error;
        }
    }

    /**
     * Debug method to check system status
     */
    async debugSystemStatus() {
        console.log('🔍 Debugging notification system status...');

        try {
            const userCount = await User.countDocuments();
            const subscriptionCount = await Subscription.countDocuments();
            const notificationCount = await Notification.countDocuments();
            console.log('📊 System Status:', {
                users: userCount,
                subscriptions: subscriptionCount,
                notifications: notificationCount,
                webpushConfigured: !!webpush
            });
        } catch (error) {
            console.error('❌ Error checking system status:', error);
        }
    }
}

module.exports = new NotificationService();