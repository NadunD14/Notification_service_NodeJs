// src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notificationId: { type: String, required: true, unique: true, index: true },
    adminId: { type: String, required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    messageType: { type: String, required: true },
    targetAudience: { type: String, required: true },
    province: { type: String },
    city: { type: String },
    route: { type: String },
    sentAt: { type: Date, default: Date.now },
    stats: {
        totalSent: { type: Number, default: 0 },
        successful: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
    clickCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
