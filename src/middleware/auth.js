// src/middleware/auth.js
require('dotenv').config();
const { verifyToken } = require('../utils/tokenVerification');

/**
 * Middleware to authenticate admin user based on JWT token
 */
const authenticateAdmin = (req, res, next) => {
    try {
        const decoded = verifyToken(req, { required: true });
        req.user = decoded;

        console.log('Authenticated user:', req.user.user_metadata.user_role);

        // Check if the user is an admin
        if (req.user.user_metadata.user_role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized', code: 'NOT_ADMIN' });
        }

        return next();  // Proceed to the next middleware or route handler
    } catch (error) {
        const code = error.code || 'TOKEN_INVALID';
        const message = error.message || 'Token is invalid';
        const status = code === 'SERVER_CONFIG' ? 500 : (code === 'NOT_ADMIN' ? 403 : 401);
        return res.status(status).json({ message, code });
    }
};

module.exports = { authenticateAdmin };
