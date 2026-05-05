import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { initSocket } from './config/socket';
import {
  configureSecurity,
  requestValidation,
  httpsRedirect,
  securityAuditLog,
} from './middlewares/security.middleware';
import { httpLogger, errorLogger } from './lib/logger';

dotenv.config();

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
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')
      : '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request validation
app.use(requestValidation);

// Security audit logging
app.use(securityAuditLog);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Error handling
app.use(errorLogger);
app.use(errorHandler);

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

const start = async () => {
  await initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
  });
};

void start();
