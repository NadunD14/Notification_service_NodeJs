// src/services/notificationService.js

const webpush = require('../config/webpush');
const dynamoHelpers = require('../utils/dynamoHelpers');

/**
 * Service for handling notifications
 */
class NotificationService {
    constructor() {
        this.usersTable = 'Users';
        this.subscriptionsTable = 'Subscriptions';
        this.notificationsTable = 'Notifications';
    }

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

        // Start with base query for user type
        let keyConditionExpression = 'userType = :userType';
        let expressionAttributeValues = { ':userType': userType };

        // Add filter expression if location filters are specified
        let filterExpression = [];

        if (province) {
            filterExpression.push('province = :province');
            expressionAttributeValues[':province'] = province;
        }

        if (city) {
            filterExpression.push('city = :city');
            expressionAttributeValues[':city'] = city;
        }

        if (route) {
            filterExpression.push('route = :route');
            expressionAttributeValues[':route'] = route;
        }

        console.log('🔍 Query params:', {
            keyConditionExpression,
            expressionAttributeValues,
            filterExpression: filterExpression.join(' AND ')
        });


        // Query for matching users
        const users = await dynamoHelpers.queryItems(
            this.usersTable,
            'userType-index',
            keyConditionExpression,
            expressionAttributeValues,
            filterExpression.length > 0 ? filterExpression.join(' AND ') : undefined
        );

        console.log(`👥 Found ${users?.length || 0} matching users`);

        if (!users || users.length === 0) {
            console.log('❌ No users found matching criteria');
            return [];
        }

        // Get all user IDs
        const userIds = users.map(user => user.userId);
        console.log('📋 User IDs:', userIds);

        // Get subscriptions for these users
        const allSubscriptions = [];
        for (const userId of userIds) {
            try {
                const subscriptions = await dynamoHelpers.queryItems(
                    this.subscriptionsTable,
                    'userId-index',
                    'userId = :userId',
                    { ':userId': userId }
                );

                if (subscriptions && subscriptions.length > 0) {
                    console.log(`📱 User ${userId} has ${subscriptions.length} subscriptions`);
                    allSubscriptions.push(...subscriptions);
                } else {
                    console.log(`📱 User ${userId} has no subscriptions`);
                }
            } catch (error) {
                console.error(`❌ Error fetching subscriptions for user ${userId}:`, error);
            }
        }

        console.log(`📊 Total subscriptions found: ${allSubscriptions.length}`);
        return allSubscriptions;
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

        const notificationId = dynamoHelpers.generateUniqueId();

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
            const result = await dynamoHelpers.createItem(this.notificationsTable, notification);
            console.log('✅ Notification created successfully:', notificationId);
            return result;
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
                    // Subscription stored as JSON string
                    try {
                        pushSubscription = JSON.parse(subscription.subscription);
                    } catch (parseError) {
                        console.error(`❌ Error parsing subscription JSON for ${subscription.subscriptionId}:`, parseError);
                        failed++;
                        continue;
                    }
                } else {
                    console.error(`❌ Invalid subscription format for ${subscription.subscriptionId}`);
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
                if (error.statusCode === 410) {
                    console.log(`🗑️ Removing invalid subscription ${subscription.subscriptionId}`);
                    try {
                        await dynamoHelpers.deleteItem(this.subscriptionsTable, {
                            subscriptionId: subscription.subscriptionId
                        });
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
            await dynamoHelpers.updateItem(
                this.notificationsTable,
                { notificationId: notification.notificationId },
                'SET stats.successful = :s, stats.failed = :f, stats.totalSent = :t',
                {
                    ':s': successful,
                    ':f': failed,
                    ':t': successful + failed
                }
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
            const result = await dynamoHelpers.updateItem(
                this.notificationsTable,
                { notificationId },
                'ADD clickCount :inc',
                { ':inc': 1 }
            );
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
            const item = await dynamoHelpers.getItem(
                this.notificationsTable,
                { notificationId }
            );
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
            const items = await dynamoHelpers.listItems(this.notificationsTable, { limit });
            // Sort descending by sentAt timestamp
            items.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
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
            // Check tables exist and have data
            const userCount = await dynamoHelpers.listItems(this.usersTable, { limit: 1 });
            const subscriptionCount = await dynamoHelpers.listItems(this.subscriptionsTable, { limit: 1 });
            const notificationCount = await dynamoHelpers.listItems(this.notificationsTable, { limit: 1 });

            console.log('📊 System Status:', {
                usersTableAccessible: userCount !== null,
                subscriptionsTableAccessible: subscriptionCount !== null,
                notificationsTableAccessible: notificationCount !== null,
                webpushConfigured: !!webpush
            });

        } catch (error) {
            console.error('❌ Error checking system status:', error);
        }
    }
}

module.exports = new NotificationService();