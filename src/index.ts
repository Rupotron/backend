import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import http from 'http';
import apiRoutes from './routes';
import * as paymentController from './controllers/payment.controller';
import { errorHandler } from './middlewares/error.middleware';
import { initSocket } from './config/socket';
import { env, validateEnv } from './config/env';
import { prisma } from './config/prisma';
import {
  configureSecurity,
  requestValidation,
  httpsRedirect,
  securityAuditLog,
} from './middlewares/security.middleware';
import { httpLogger, errorLogger } from './lib/logger';

validateEnv();

const app = express();

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// HTTPS redirect
app.use(httpsRedirect);

// Security configuration
configureSecurity(app);

// Logging
app.use(httpLogger);

// CORS
const corsOptions: cors.CorsOptions = {
  origin: env.isProduction
    ? (origin, callback) => {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      }
    : true,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Razorpay webhooks must be mounted before JSON parsing so HMAC verification sees the raw body.
app.post('/api/v1/payment/webhook', express.raw({ type: 'application/json', limit: '1mb' }), paymentController.handleWebhook);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request validation
app.use(requestValidation);

// Security audit logging
app.use(securityAuditLog);

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
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not_ready', message: 'Database unavailable' });
  }
});

// API Routes
app.use('/api/v1', apiRoutes);

app.use('/api/v1', (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling
app.use(errorLogger);
app.use(errorHandler);

const httpServer = http.createServer(app);
const PORT = env.port;

const start = async () => {
  await initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
  });
};

const shutdown = async (signal: string) => {
  console.info(`[Shutdown] Received ${signal}. Closing server...`);
  httpServer.close(async () => {
    await prisma.$disconnect();
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
