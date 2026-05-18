"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.httpLogger = exports.LogLevel = void 0;
/**
 * Structured logging utility for production environments
 * Uses JSON format for easy parsing by log aggregation services
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "ERROR";
    LogLevel["WARN"] = "WARN";
    LogLevel["INFO"] = "INFO";
    LogLevel["DEBUG"] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const sanitizeMetadata = (entry) => {
    const { timestamp, level, message, service, ...metadata } = entry;
    return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== ''));
};
class Logger {
    logLevel;
    service = 'backend';
    constructor(logLevel = process.env.LOG_LEVEL || 'info') {
        this.logLevel = this.parseLogLevel(logLevel.toUpperCase());
    }
    parseLogLevel(level) {
        const levels = {
            ERROR: LogLevel.ERROR,
            WARN: LogLevel.WARN,
            INFO: LogLevel.INFO,
            DEBUG: LogLevel.DEBUG,
        };
        return levels[level] || LogLevel.INFO;
    }
    formatLog(entry) {
        if (process.env.LOG_FORMAT === 'json') {
            return JSON.stringify(entry);
        }
        const metadata = sanitizeMetadata(entry);
        const details = Object.keys(metadata).length > 0
            ? ` ${JSON.stringify(metadata)}`
            : '';
        return `[${entry.timestamp}] [${entry.level}] ${entry.message}${details}`;
    }
    shouldLog(level) {
        const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
        const currentIndex = levels.indexOf(this.logLevel);
        const messageIndex = levels.indexOf(level);
        return messageIndex <= currentIndex;
    }
    error(message, error, metadata) {
        if (!this.shouldLog(LogLevel.ERROR))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            message,
            service: this.service,
            ...(metadata && { ...metadata }),
            ...(error && {
                error: error.message,
                stack: error.stack,
            }),
        };
        console.error(this.formatLog(entry));
    }
    warn(message, metadata) {
        if (!this.shouldLog(LogLevel.WARN))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.WARN,
            message,
            service: this.service,
            ...(metadata && { ...metadata }),
        };
        console.warn(this.formatLog(entry));
    }
    info(message, metadata) {
        if (!this.shouldLog(LogLevel.INFO))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.INFO,
            message,
            service: this.service,
            ...(metadata && { ...metadata }),
        };
        console.info(this.formatLog(entry));
    }
    debug(message, metadata) {
        if (!this.shouldLog(LogLevel.DEBUG))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.DEBUG,
            message,
            service: this.service,
            ...(metadata && { ...metadata }),
        };
        console.log(this.formatLog(entry));
    }
}
const logger = new Logger();
/**
 * HTTP Request logging middleware
 */
const httpLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
    // Attach requestId to request object for later use
    req.requestId = requestId;
    // Intercept res.send to capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Log request
        logger.info('HTTP Request', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
        // Log errors
        if (statusCode >= 400) {
            logger.warn('HTTP Request Error', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode,
                duration: `${duration}ms`,
            });
        }
        return originalSend.call(this, data);
    };
    next();
};
exports.httpLogger = httpLogger;
/**
 * Error logging middleware
 */
const errorLogger = (error, req, res, next) => {
    const requestId = req.requestId || 'unknown';
    logger.error('Unhandled Error', error, {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        statusCode: error.statusCode || error.status || 500,
        code: error.code,
    });
    next();
};
exports.errorLogger = errorLogger;
exports.default = logger;
