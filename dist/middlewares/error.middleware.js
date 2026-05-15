"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('[Error]:', err?.message || err);
    // Prisma: DB connection / unreachable
    if (err?.code === 'P1001' || err?.message?.includes("Can't reach database")) {
        return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    // Prisma: record not found
    if (err?.code === 'P2025') {
        return res.status(404).json({ message: err.meta?.cause || 'Resource not found.' });
    }
    // Prisma: unique constraint violation
    if (err?.code === 'P2002') {
        return res.status(409).json({ message: 'A record with that value already exists.' });
    }
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ message, error: message });
};
exports.errorHandler = errorHandler;
