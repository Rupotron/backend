"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const isProduction = process.env.NODE_ENV === 'production';
const errorHandler = (err, req, res, _next) => {
    console.error('[Error]:', {
        message: err?.message || String(err),
        method: req.method,
        path: req.originalUrl,
        statusCode: err.statusCode || err.status || 500,
        code: err.code,
        stack: err.stack,
    });
    if (res.headersSent)
        return;
    if (err?.code === 'P1001' || err?.message?.includes("Can't reach database")) {
        res.status(503).json({ message: 'Database unavailable. Please try again later.' });
        return;
    }
    if (err?.code === 'P2025') {
        res.status(404).json({ message: err.meta?.cause || 'Resource not found.' });
        return;
    }
    if (err?.code === 'P2002') {
        res.status(409).json({ message: 'A record with that value already exists.' });
        return;
    }
    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode >= 500 && isProduction
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';
    res.status(statusCode).json({
        message,
        ...(isProduction ? {} : { error: err.message, stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
