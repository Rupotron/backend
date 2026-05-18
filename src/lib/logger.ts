import { Request, Response, NextFunction } from 'express';

/**
 * Structured logging utility for production environments
 * Uses JSON format for easy parsing by log aggregation services
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: any;
}

const sanitizeMetadata = (entry: LogEntry) => {
  const { timestamp, level, message, service, ...metadata } = entry;
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
};

class Logger {
  private logLevel: LogLevel;
  private service: string = 'backend';

  constructor(logLevel: string = process.env.LOG_LEVEL || 'info') {
    this.logLevel = this.parseLogLevel(logLevel.toUpperCase());
  }

  private parseLogLevel(level: string): LogLevel {
    const levels: { [key: string]: LogLevel } = {
      ERROR: LogLevel.ERROR,
      WARN: LogLevel.WARN,
      INFO: LogLevel.INFO,
      DEBUG: LogLevel.DEBUG,
    };
    return levels[level] || LogLevel.INFO;
  }

  private formatLog(entry: LogEntry): string {
    if (process.env.LOG_FORMAT === 'json') {
      return JSON.stringify(entry);
    }

    const metadata = sanitizeMetadata(entry);
    const details = Object.keys(metadata).length > 0
      ? ` ${JSON.stringify(metadata)}`
      : '';

    return `[${entry.timestamp}] [${entry.level}] ${entry.message}${details}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      service: this.service,
      ...(metadata && { ...metadata }),
      ...(error && {
        error: error.message,
        stack: error.stack,
      }),
    };

    console.error(this.formatLog(entry));
  }

  warn(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      service: this.service,
      ...(metadata && { ...metadata }),
    };

    console.warn(this.formatLog(entry));
  }

  info(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      service: this.service,
      ...(metadata && { ...metadata }),
    };

    console.info(this.formatLog(entry));
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      service: this.service,
      ...(metadata && { ...metadata }),
    };

    console.log(this.formatLog(entry));
  }
}

const logger = new Logger();

/**
 * HTTP Request logging middleware
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  // Attach requestId to request object for later use
  (req as any).requestId = requestId;

  // Intercept res.send to capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log request
    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });

    // Log errors
    if (statusCode >= 400) {
      logger.warn('HTTP Request Error', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (
  error: Error & { status?: number; statusCode?: number; code?: string },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId || 'unknown';
  
  logger.error('Unhandled Error', error, {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    statusCode: error.statusCode || error.status || 500,
    code: error.code,
  });

  next();
};

export default logger;
