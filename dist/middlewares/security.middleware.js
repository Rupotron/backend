"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityAuditLog = exports.httpsRedirect = exports.requestValidation = exports.configureSecurity = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const compression_1 = __importDefault(require("compression"));
/**
 * Configure security middleware
 * Implements OWASP security best practices
 */
const configureSecurity = (app) => {
    // Helmet - sets various HTTP headers
    app.use((0, helmet_1.default)());
    // Compression middleware
    app.use((0, compression_1.default)());
    // Data sanitization against NoSQL injection
    app.use((0, express_mongo_sanitize_1.default)());
    // General rate limiter
    const generalLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    // Strict rate limiter for auth endpoints
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: 'Too many login attempts, please try again after 15 minutes',
        skipSuccessfulRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
    });
    // Rate limiter for payment endpoints
    const paymentLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000, // 1 minute
        max: 10, // limit to 10 requests per minute
        message: 'Too many payment requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    });
    // Apply rate limiters
    app.use('/api/v1/', generalLimiter);
    app.use('/api/v1/auth/login', authLimiter);
    app.use('/api/v1/auth/register', authLimiter);
    app.use('/api/v1/payments/', paymentLimiter);
    // CORS hardening - only in production
    if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
        app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (origin && allowedOrigins.includes(origin.trim())) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            next();
        });
    }
    // Security headers middleware
    app.use((req, res, next) => {
        // Prevent content type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        // Enable XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        // Remove powered by header
        res.removeHeader('X-Powered-By');
        // Referrer policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
    // Hide server details
    app.disable('x-powered-by');
};
exports.configureSecurity = configureSecurity;
/**
 * Request validation middleware
 * Prevents malicious payloads
 */
const requestValidation = (req, res, next) => {
    // Check content type for POST/PUT/PATCH requests
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
 * HTTPS redirect middleware
 * Enforce HTTPS in production
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
/**
 * Security audit logging middleware
 */
const securityAuditLog = (req, res, next) => {
    // Log suspicious patterns
    const body = JSON.stringify(req.body);
    // Check for SQL injection patterns
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi;
    if (sqlInjectionPattern.test(body)) {
        console.warn(`[SECURITY] Potential SQL injection detected from ${req.ip}`);
    }
    // Check for XSS patterns
    const xssPattern = /(<script|javascript:|onerror|onload)/gi;
    if (xssPattern.test(body)) {
        console.warn(`[SECURITY] Potential XSS attack detected from ${req.ip}`);
    }
    next();
};
exports.securityAuditLog = securityAuditLog;
