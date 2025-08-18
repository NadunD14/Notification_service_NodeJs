// src/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Parse cookies from request headers without relying on cookie-parser
 */
function parseCookies(req) {
    const header = req.headers?.cookie;
    if (!header) return {};
    return header.split(';').reduce((acc, part) => {
        const [k, ...v] = part.trim().split('=');
        if (k) acc[decodeURIComponent(k)] = decodeURIComponent(v.join('='));
        return acc;
    }, {});
}

/**
 * Extract bearer token from (in order): Authorization header, cookies, query param
 */
function extractToken(req) {
    // Authorization: Bearer <token>
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
            return parts[1];
        }
        // Allow raw token (no Bearer prefix) as fallback
        if (parts.length === 1 && parts[0].length > 10) return parts[0];
    }

    // Cookies (common names)
    const cookies = parseCookies(req);
    if (cookies.access_token) return cookies.access_token;
    if (cookies.adminToken) return cookies.adminToken;

    // Query param (useful for debugging / websockets)
    if (req.query && req.query.token) return req.query.token;

    return null;
}

const authenticateAdmin = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ message: 'No authentication token, access denied', code: 'NO_TOKEN' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET missing');
            return res.status(500).json({ message: 'Server auth configuration error', code: 'SERVER_CONFIG' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not authorized', code: 'NOT_ADMIN' });
        }

        return next();
    } catch (error) {
        let code = 'TOKEN_INVALID';
        let message = 'Token is invalid';
        if (error.name === 'TokenExpiredError') { code = 'TOKEN_EXPIRED'; message = 'Token has expired'; }
        else if (error.name === 'JsonWebTokenError') { code = 'TOKEN_MALFORMED'; message = 'Malformed token'; }
        else if (error.name === 'NotBeforeError') { code = 'TOKEN_NOT_ACTIVE'; message = 'Token not active yet'; }

        return res.status(401).json({ message, code });
    }
};

module.exports = { authenticateAdmin };
