// src/server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const notificationRoutes = require('./routes/notificationRoutes');
const pushRoutes = require('./routes/pushRoutes');
require('dotenv').config();

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
