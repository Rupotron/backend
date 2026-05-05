"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('[Error]:', err);
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ message, error: message });
};
exports.errorHandler = errorHandler;
