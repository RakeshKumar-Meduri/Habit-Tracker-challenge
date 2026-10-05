import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ENV } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Zod Validation Errors
  if (err instanceof ZodError) {
    const message = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: message || 'Invalid input data',
      },
    });
  }

  // Known Application Errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Database / System Errors
  console.error('[Unhandled Server Error]', req.method, req.path, err);

  const isProduction = ENV.IS_PROD;
  const message = isProduction ? 'An unexpected internal error occurred' : (err.message || 'Internal server error');

  return res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  });
}
