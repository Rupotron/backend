import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';

/**
 * Configure security middleware
 * Implements OWASP security best practices
 */
export const configureSecurity = (app: Express) => {
  // Helmet - sets various HTTP headers
  app.use(helmet());

  // Compression middleware
  app.use(compression());

  // Data sanitization against NoSQL injection
  app.use(mongoSanitize());

  // General rate limiter
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict rate limiter for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes',
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter for payment endpoints
  const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit to 10 requests per minute
    message: 'Too many payment requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters
  app.use('/api/v1/', generalLimiter);
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);
  app.use('/api/v1/payments/', paymentLimiter);

  // CORS hardening - only in production
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
    app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin.trim())) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      next();
    });
  }

  // Security headers middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent content type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Remove powered by header
    res.removeHeader('X-Powered-By');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  });

  // Hide server details
  app.disable('x-powered-by');
};

/**
 * Request validation middleware
 * Prevents malicious payloads
 */
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
  // Check content type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(400).json({
        status: 'error',
        message: 'Content-Type must be application/json',
      });
    }
  }

  next();
};

/**
 * HTTPS redirect middleware
 * Enforce HTTPS in production
 */
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
  }
  next();
};

/**
 * Security audit logging middleware
 */
export const securityAuditLog = (req: Request, res: Response, next: NextFunction) => {
  // Log suspicious patterns
  const body = JSON.stringify(req.body);
  
  // Check for SQL injection patterns
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi;
  if (sqlInjectionPattern.test(body)) {
    console.warn(`[SECURITY] Potential SQL injection detected from ${req.ip}`);
  }

  // Check for XSS patterns
  const xssPattern = /(<script|javascript:|onerror|onload)/gi;
  if (xssPattern.test(body)) {
    console.warn(`[SECURITY] Potential XSS attack detected from ${req.ip}`);
  }

  next();
};
