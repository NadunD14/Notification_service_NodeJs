// src/config/mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function connectMongo() {
    if (isConnected) return mongoose.connection;
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notifications_service';
    const options = {
        autoIndex: true,
        maxPoolSize: 10,
    };
    try {
        await mongoose.connect(uri, options);
        isConnected = true;
        console.log('✅ Connected to MongoDB');
        return mongoose.connection;
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        throw err;
    }
}

module.exports = { connectMongo };
