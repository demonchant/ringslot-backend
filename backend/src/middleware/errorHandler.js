import logger from '../utils/logger.js';
import { AppError, ValidationError, AuthError, NotFoundError } from '../utils/errors.js';

/**
 * Centralized error handler middleware.
 * Logs errors with request context and returns sanitized responses.
 */
export function errorHandler(err, req, res, _next) {
  const requestId = req.id || 'unknown';
  const durationMs = req.startTime ? Date.now() - req.startTime : null;

  // Determine if this is a known operational error
  const isOperational = err instanceof AppError && err.isOperational;
  const statusCode = err.statusCode || 500;

  // Log the error
  const logPayload = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    durationMs,
    error: err.message,
  };

  if (!isOperational) {
    // Unknown/programmer errors get full stack trace logged
    logPayload.stack = err.stack;
    logger.error('Unhandled error', logPayload);
  } else {
    logger.warn('Operational error', logPayload);
  }

  // Build response
  const response = {
    error: {
      message: isOperational ? err.message : 'Internal server error',
      code: err.name || 'InternalError',
      requestId,
    },
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.error.stack = err.stack;
  }

  // Include validation details if present
  if (err instanceof ValidationError && err.details) {
    response.error.details = err.details;
  }

  res.status(statusCode).json(response);
}
