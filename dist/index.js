"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const socket_1 = require("./config/socket");
const security_middleware_1 = require("./middlewares/security.middleware");
const logger_1 = require("./lib/logger");
dotenv_1.default.config();
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
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')
        : '*',
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
// Body parsing
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request validation
app.use(security_middleware_1.requestValidation);
// Security audit logging
app.use(security_middleware_1.securityAuditLog);
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/v1', routes_1.default);
// Error handling
app.use(logger_1.errorLogger);
app.use(error_middleware_1.errorHandler);
const httpServer = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
const start = async () => {
    await (0, socket_1.initSocket)(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
    });
};
void start();
