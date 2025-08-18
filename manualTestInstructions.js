// Backend/manualTestInstructions.js

/*
TESTING INSTRUCTIONS FOR THE PUSH NOTIFICATION SYSTEM
====================================================

1. START THE BACKEND SERVER
--------------------------
In a terminal, navigate to the Backend folder and run:
   node server.js

This starts the Express server that will handle push subscriptions and send notifications.

2. START THE FRONTEND SERVER
---------------------------
In another terminal, navigate to the Frontend folder and run:
   npm run dev

This starts the Next.js development server, typically on http://localhost:3000

3. OPEN THE WEBSITE AND SUBSCRIBE
-------------------------------
a) Open http://localhost:3000 in a Chrome browser
b) Click the "Enable Notifications" button
c) Allow the notification permission when prompted
d) Check the backend terminal - you should see a message that a subscription was saved

4. SEND A TEST NOTIFICATION
-------------------------
In a third terminal, navigate to the Backend folder and run:
   node testSendNotification.js

This will send a test notification to all subscribed clients.

5. OBSERVE THE NOTIFICATION
-------------------------
If everything is working correctly, you should see a notification appear on your system.

TROUBLESHOOTING
--------------
- Make sure both servers are running
- Check browser console for any errors
- Check if service worker is registered (in Chrome DevTools → Application → Service Workers)
- Verify that subscription was saved in the backend terminal
- Try testing in Chrome, as it has the best support for Push API

NOTE: If you're developing on localhost, push notifications will only work in supporting
browsers like Chrome, Edge, Firefox, etc. Safari has limited support for Web Push.
*/

console.log("This file contains instructions for testing the push notification system.");
console.log("Please follow the steps outlined in the file comments to test the system.");
