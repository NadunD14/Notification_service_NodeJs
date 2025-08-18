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

        // Get users matching the criteria
        const params = {
            TableName: this.usersTable,
            IndexName: 'userType-index',
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues
        };

        if (filterExpression.length > 0) {
            params.FilterExpression = filterExpression.join(' AND ');
        }

        // Query for matching users
        const users = await dynamoHelpers.queryItems(
            this.usersTable,
            'userType-index',
            keyConditionExpression,
            expressionAttributeValues
        );

        if (!users || users.length === 0) {
            return [];
        }

        // Get all user IDs
        const userIds = users.map(user => user.userId);

        // Get subscriptions for these users
        // Note: For large numbers of users, we would need to batch this operation
        const allSubscriptions = [];
        for (const userId of userIds) {
            const subscriptions = await dynamoHelpers.queryItems(
                this.subscriptionsTable,
                'userId-index',
                'userId = :userId',
                { ':userId': userId }
            );

            allSubscriptions.push(...subscriptions);
        }

        return allSubscriptions;
    }

    /**
     * Create and save a notification record
     * @param {object} notificationData - The notification data
     * @returns {Promise<object>} - The created notification
     */
    async createNotification(notificationData) {
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
        return dynamoHelpers.createItem(this.notificationsTable, notification);
    }

    /**
     * Send notification to all matching subscriptions
     * @param {object} notification - The notification object
     * @param {Array} subscriptions - Array of subscription objects
     * @returns {Promise<object>} - Stats about the notification delivery
     */
    async sendNotification(notification, subscriptions) {

        let successful = 0;
        let failed = 0;

        for (const subscription of subscriptions) {
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

                await webpush.sendNotification(
                    subscription.endpoint ? subscription : JSON.parse(subscription.subscription),
                    JSON.stringify(payload)
                );
                successful++;
            } catch (error) {
                failed++;
                console.error(`Failed to send notification to subscription: ${subscription.subscriptionId}`, error);

                // Remove invalid subscriptions
                if (error.statusCode === 410) {
                    await dynamoHelpers.deleteItem(this.subscriptionsTable, {
                        subscriptionId: subscription.subscriptionId
                    });
                }
            }
        }

        // Update notification stats
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
        return dynamoHelpers.updateItem(
            this.notificationsTable,
            { notificationId },
            'ADD clickCount :inc',
            { ':inc': 1 }
        );
    }

    /**
     * Get notification details
     * @param {string} notificationId - The notification ID
     * @returns {Promise<object|null>} - The notification details or null if not found
     */
    async getNotificationDetails(notificationId) {
        const item = await dynamoHelpers.getItem(
            this.notificationsTable,
            { notificationId }
        );
        return item || null;
    }

    /**
     * List recent notifications (basic fields) ordered by sentAt descending (client can sort if Dynamo not indexed)
     * NOTE: For production, create a GSI on sentAt to efficiently query; scan used here for simplicity.
     * @param {number} limit
     */
    async listRecentNotifications(limit = 50) {
        const items = await dynamoHelpers.listItems(this.notificationsTable, { limit });
        // Sort descending by sentAt timestamp
        items.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
        return items.map(n => ({
            notificationId: n.notificationId,
            title: n.title,
            content: n.body, // mapping body -> content for frontend expectation
            dateCreated: n.sentAt
        }));
    }
}

module.exports = new NotificationService();
