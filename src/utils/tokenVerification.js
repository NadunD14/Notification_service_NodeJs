// src/utils/tokenVerification.js
// Centralized helpers for extracting and verifying JWT tokens.

const jwt = require('jsonwebtoken');

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
    // Fix: use req.headers directly, not req.header() function
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
            return parts[1];
        }
        if (parts.length === 1 && parts[0].length > 10) return parts[0];
    }

    const cookies = parseCookies(req);
    if (cookies.access_token) return cookies.access_token;
    if (cookies.adminToken) return cookies.adminToken;

    if (req.query && req.query.token) return req.query.token;

    return null;
}

/**
 * Verify JWT token present in request.
 * @param {Request} req
 * @param {Object} options
 * @param {boolean} [options.required=true] - If false, returns null when no token.
 * @returns {object|null} decoded token payload
 * @throws Error with .code if invalid/missing when required
 */
function verifyToken(req, { required = true } = {}) {
    const token = extractToken(req);

    if (!token) {
        if (!required) return null;
        const err = new Error('No authentication token, access denied');
        err.code = 'NO_TOKEN';
        throw err;
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET missing from environment');
        const err = new Error('Server auth configuration error');
        err.code = 'SERVER_CONFIG';
        throw err;
    }

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (!required) return null; // Don't throw error if auth is optional
        if (error.name === 'TokenExpiredError') error.code = 'TOKEN_EXPIRED';
        else if (error.name === 'JsonWebTokenError') error.code = 'TOKEN_MALFORMED';
        else if (error.name === 'NotBeforeError') error.code = 'TOKEN_NOT_ACTIVE';
        else error.code = 'TOKEN_INVALID';
        throw error;
    }
}

module.exports = { parseCookies, extractToken, verifyToken };