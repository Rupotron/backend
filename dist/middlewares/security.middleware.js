"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpsRedirect = exports.securityAuditLog = exports.requestValidation = exports.configureSecurity = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const compression_1 = __importDefault(require("compression"));
/**
 * Configure security middleware
 */
const configureSecurity = (app) => {
    // Sets various HTTP headers for security
    app.use((0, helmet_1.default)());
    // Performance - Gzip compression
    app.use((0, compression_1.default)());
    // Data sanitization against NoSQL injection
    app.use((0, express_mongo_sanitize_1.default)());
    // Rate Limiting
    const generalLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/v1/', generalLimiter);
    // CORS Configuration
    const allowedOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        // Check if the request's origin is in our allowed list
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
        // Handle Preflight (OPTIONS) requests immediately
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        next();
    });
    // Additional Security Headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.removeHeader('X-Powered-By');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
    app.disable('x-powered-by');
};
exports.configureSecurity = configureSecurity;
/**
 * Request validation middleware
 */
const requestValidation = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!req.is('application/json')) {
            return res.status(400).json({
                status: 'error',
                message: 'Content-Type must be application/json',
            });
        }
    }
    next();
};
exports.requestValidation = requestValidation;
/**
 * Security audit logging middleware
 */
const securityAuditLog = (req, res, next) => {
    // Simple placeholder for security audit logging
    next();
};
exports.securityAuditLog = securityAuditLog;
/**
 * HTTPS redirect middleware
 */
const httpsRedirect = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            return res.redirect('https://' + req.get('host') + req.url);
        }
    }
    next();
};
exports.httpsRedirect = httpsRedirect;
