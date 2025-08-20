// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    userType: { type: String, required: true, index: true }, // passengers, conductors, mot_officers, fleet_operators, Admin
    province: { type: String },
    city: { type: String },
    route: { type: String },
    email: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
