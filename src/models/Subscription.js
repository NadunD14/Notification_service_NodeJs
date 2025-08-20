// src/models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    subscriptionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    subscription: { type: Object, required: true }, // raw push subscription object
    addedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for efficient duplicate checking
subscriptionSchema.index({ 'subscription.endpoint': 1, userId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
