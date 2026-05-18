import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';

/**
 * Configure security middleware
 */
export const configureSecurity = (app: Express) => {
  // Sets various HTTP headers for security
  app.use(helmet());

  // Performance - Gzip compression
  app.use(compression());

  // Data sanitization against NoSQL injection
  app.use(mongoSanitize());

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/v1/', generalLimiter);

  // Additional Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.removeHeader('X-Powered-By');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.disable('x-powered-by');
};

/**
 * Request validation middleware
 */
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (contentLength > 0 && !req.is('application/json')) {
      return res.status(400).json({
        status: 'error',
        message: 'Content-Type must be application/json',
      });
    }
  }
  next();
};

/**
 * Security audit logging middleware
 */
export const securityAuditLog = (req: Request, res: Response, next: NextFunction) => {
  // Simple placeholder for security audit logging
  next();
};

/**
 * HTTPS redirect middleware
 */
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
  }
  next();
};
