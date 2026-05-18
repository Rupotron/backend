"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const routes_1 = __importDefault(require("./routes"));
const paymentController = __importStar(require("./controllers/payment.controller"));
const error_middleware_1 = require("./middlewares/error.middleware");
const socket_1 = require("./config/socket");
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
const security_middleware_1 = require("./middlewares/security.middleware");
const logger_1 = require("./lib/logger");
(0, env_1.validateEnv)();
const app = (0, express_1.default)();
// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
// HTTPS redirect
app.use(security_middleware_1.httpsRedirect);
// Security configuration
(0, security_middleware_1.configureSecurity)(app);
// Logging
app.use(logger_1.httpLogger);
// CORS
const corsOptions = {
    origin: env_1.env.isProduction
        ? (origin, callback) => {
            if (!origin || env_1.env.allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        }
        : true,
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
// Razorpay webhooks must be mounted before JSON parsing so HMAC verification sees the raw body.
app.post('/api/v1/payment/webhook', express_1.default.raw({ type: 'application/json', limit: '1mb' }), paymentController.handleWebhook);
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request validation
app.use(security_middleware_1.requestValidation);
// Security audit logging
app.use(security_middleware_1.securityAuditLog);
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.get('/api/v1/ready', async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
    }
    catch {
        res.status(503).json({ status: 'not_ready', message: 'Database unavailable' });
    }
});
// API Routes
app.use('/api/v1', routes_1.default);
app.use('/api/v1', (_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// Error handling
app.use(logger_1.errorLogger);
app.use(error_middleware_1.errorHandler);
const httpServer = http_1.default.createServer(app);
const PORT = env_1.env.port;
const start = async () => {
    await (0, socket_1.initSocket)(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
    });
};
const shutdown = async (signal) => {
    console.info(`[Shutdown] Received ${signal}. Closing server...`);
    httpServer.close(async () => {
        await prisma_1.prisma.$disconnect();
        console.info('[Shutdown] Complete');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('[Shutdown] Forced exit after timeout');
        process.exit(1);
    }, 10000).unref();
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled rejection', reason);
});
process.on('uncaughtException', (error) => {
    console.error('[Process] Uncaught exception', error);
    void shutdown('uncaughtException');
});
void start().catch((error) => {
    console.error('[Startup] Failed to start server', error);
    process.exit(1);
});
