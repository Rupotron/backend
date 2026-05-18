"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authMiddleware = void 0;
const jwt_util_1 = require("../utils/jwt.util");
const authMiddleware = (req, res, next) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        const decoded = (0, jwt_util_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
