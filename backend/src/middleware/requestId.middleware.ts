import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incomingId = req.get('X-Request-Id') || req.get('X-Correlation-Id');
  const validIncomingId = incomingId && SAFE_REQUEST_ID_REGEX.test(incomingId.trim()) ? incomingId.trim() : null;

  const requestId = validIncomingId || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};
