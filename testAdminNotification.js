// Backend/testAdminNotification.js

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Create a test JWT token for admin authentication
 * In a real application, this would come from your authentication system
 */
function createAdminTestToken() {
    const payload = {
        userId: 'admin-123',
        name: 'Test Admin',
        email: 'admin@example.com',
        userType: 'admin'
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

/**
 * Send a test notification to targeted users
 */
async function sendTestNotification() {
    try {
        const token = createAdminTestToken();

        const notificationData = {
            title: 'System Maintenance',
            subject: 'Scheduled Downtime',
            body: 'The system will be unavailable on Sunday from 2 AM to 4 AM due to scheduled maintenance.',
            messageType: 'maintenance', // info, warning, critical, maintenance
            targetAudience: 'passengers', // all, passengers, conductors, mot_officers, fleet_operators
            province: 'Western', // Optional: Filter by province
            city: 'Colombo', // Optional: Filter by city
            route: 'Route-138' // Optional: Filter by route
        };

        console.log('Sending notification with data:', notificationData);

        const response = await fetch('http://localhost:3001/api/notifications/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(notificationData)
        });

        const result = await response.json();
        console.log('Notification API response:', result);

        if (!response.ok) {
            throw new Error(`API error: ${result.message}`);
        }

        console.log('Notification sent successfully!');
        console.log(`Stats: ${result.stats.successful} successful, ${result.stats.failed} failed`);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Execute the function
sendTestNotification();
