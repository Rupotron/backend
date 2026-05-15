import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. TEMPORARY: Print the exact error to the Render logs!
  console.error("🔥 THE REAL ERROR IS:", err.message);
  console.error(err.stack);

  // 2. Send the error to the frontend
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
