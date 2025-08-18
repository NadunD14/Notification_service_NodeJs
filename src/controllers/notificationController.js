// src/controllers/notificationController.js

const notificationService = require('../services/notificationService');

/**
 * Send notification to targeted users
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const sendNotification = async (req, res) => {
    console.log('Received request to send notification:', req.body);
    try {
        const {
            title,
            subject,
            body,
            messageType,
            targetAudience,
            province,
            city,
            route
        } = req.body;

        // Validate required fields
        if (!title || !subject || !body || !messageType || !targetAudience) {
            return res.status(400).json({
                message: 'Missing required fields: title, subject, body, messageType, and targetAudience are required'
            });
        }

        // Validate message type
        const validMessageTypes = ['info', 'warning', 'critical', 'maintenance'];
        if (!validMessageTypes.includes(messageType)) {
            return res.status(400).json({
                message: `Invalid messageType. Must be one of: ${validMessageTypes.join(', ')}`
            });
        }

        // Validate target audience
        const validAudiences = ['all', 'passengers', 'conductors', 'mot_officers', 'fleet_operators'];
        if (!validAudiences.includes(targetAudience)) {
            return res.status(400).json({
                message: `Invalid targetAudience. Must be one of: ${validAudiences.join(', ')}`
            });
        }

        // Create notification record
        const notification = await notificationService.createNotification({
            adminId: req.user.userId,
            title,
            subject,
            body,
            messageType,
            targetAudience,
            province,
            city,
            route
        });

        // Get subscriptions by target criteria
        const targetCriteria = {
            userType: targetAudience === 'all' ? null : targetAudience,
            province,
            city,
            route
        };

        const subscriptions = await notificationService.getSubscriptionsByTargetCriteria(targetCriteria);

        if (subscriptions.length === 0) {
            return res.status(404).json({
                message: 'No subscriptions found matching the target criteria',
                notificationId: notification.notificationId
            });
        }

        // Send notifications
        const result = await notificationService.sendNotification(notification, subscriptions);

        res.status(200).json({
            message: 'Notification sent successfully',
            notificationId: notification.notificationId,
            stats: {
                successful: result.successful,
                failed: result.failed,
                totalSent: result.totalSent
            }
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ message: 'Failed to send notification', error: error.message });
    }
};

/**
 * Record notification click
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const recordNotificationClick = async (req, res) => {
    try {
        const { notificationId } = req.body;

        if (!notificationId) {
            return res.status(400).json({ message: 'notificationId is required' });
        }

        await notificationService.recordNotificationClick(notificationId);

        res.status(200).json({ message: 'Notification click recorded successfully' });
    } catch (error) {
        console.error('Error recording notification click:', error);
        res.status(500).json({ message: 'Failed to record notification click', error: error.message });
    }
};

/**
 * Get notification details
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getNotificationDetails = async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({ message: 'notificationId is required' });
        }

        const notification = await notificationService.getNotificationDetails(notificationId);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json({ notification });
    } catch (error) {
        console.error('Error getting notification details:', error);
        res.status(500).json({ message: 'Failed to get notification details', error: error.message });
    }
};

/**
 * List recent notifications (Title, Content, DateCreated)
 */
const listNotifications = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const notifications = await notificationService.listRecentNotifications(limit);
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error listing notifications:', error);
        res.status(500).json({ message: 'Failed to list notifications', error: error.message });
    }
};

module.exports = {
    sendNotification,
    recordNotificationClick,
    getNotificationDetails,
    listNotifications
};
