// Backend/testSendNotification.js

const fetch = require('node-fetch');

// Function to send a test notification
async function sendTestNotification() {
    try {
        const response = await fetch('http://localhost:3001/send-push-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                targetAll: true, // Send to all subscribed users
                title: 'Test Notification',
                body: 'This is a test notification from the push notification system!',
            }),
        });

        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Execute the function
sendTestNotification();
