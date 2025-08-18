// src/routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateAdmin } = require('../middleware/auth');

// Routes requiring admin authentication
router.post('/send', authenticateAdmin, notificationController.sendNotification);
router.get('/details/:notificationId', authenticateAdmin, notificationController.getNotificationDetails);
router.get('/list', authenticateAdmin, notificationController.listNotifications);

// Public routes
router.post('/click', notificationController.recordNotificationClick);

module.exports = router;
