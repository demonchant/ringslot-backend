import crypto from 'crypto';

/**
 * Middleware that generates a UUID request ID, attaches it to req.id,
 * sets the X-Request-Id response header, and records request start time.
 */
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', id);
  next();
}
