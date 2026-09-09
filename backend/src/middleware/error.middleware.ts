import { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isAppError = err instanceof AppError;
  // Only known parser failures are public client errors; do not trust an
  // arbitrary exception's status/message as a safe HTTP response.
  const parserError = err?.type === 'entity.parse.failed'
    ? { status: 400, code: 'INVALID_JSON', message: 'Request body must be valid JSON.' }
    : err?.type === 'entity.too.large'
      ? { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size.' }
      : undefined;
  const statusCode = isAppError ? err.statusCode : parserError?.status ?? 500;
  const errorCode = isAppError ? err.code : parserError?.code ?? 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? err.message : parserError?.message ?? 'An unexpected error occurred';
  const details = isAppError ? err.details : undefined;

  logger.error(
    {
      error: {
        name: err.name,
        message: message,
        stack: env.NODE_ENV !== 'production' && isAppError ? err.stack?.replace(/[?#][^\s]*/g, '[REDACTED]') : undefined,
        statusCode,
        code: errorCode,
        details,
      },
      req: {
        id: req.id,
        method: req.method,
        url: req.originalUrl.split(/[?#]/)[0],
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
      ...(req.id ? { requestId: req.id } : {}),
      ...(details ? { details } : {}),
    },
  });
};
