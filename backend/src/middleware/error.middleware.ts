import { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const errorCode = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred';
  const details = isAppError ? err.details : undefined;

  logger.error(
    {
      error: {
        name: err.name,
        message: err.message,
        stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
        statusCode,
        code: errorCode,
        details,
      },
      req: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
    },
    'Request error encountered',
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
    },
  });
};
