import redis from '../config/redis.js';
import logger from '../utils/logger.js';

const CURRENT_API_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];

// Default rate limit: 100 requests per minute per key
const DEFAULT_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '100', 10);
const RATE_LIMIT_WINDOW = 60; // seconds

/**
 * API versioning and rate limiting middleware.
 *
 * - Adds API-Version response header
 * - Supports Accept-Version header for version negotiation
 * - Adds X-RateLimit-* headers
 * - Tracks per-key usage in Redis
 */
export default function apiVersion(req, res, next) {
  // ── Version Negotiation ──────────────────────────────────────────
  const requestedVersion = req.headers['accept-version'];

  if (requestedVersion && !SUPPORTED_VERSIONS.includes(requestedVersion)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      requested: requestedVersion,
      supported: SUPPORTED_VERSIONS,
      current: CURRENT_API_VERSION,
    });
  }

  const activeVersion = requestedVersion || CURRENT_API_VERSION;
  res.setHeader('API-Version', activeVersion);
  req.apiVersion = activeVersion;

  // ── Rate Limiting & Usage Tracking ───────────────────────────────
  // Determine the identity for rate limiting (API key or user ID)
  const apiKey = req.headers['x-api-key'];
  const identifier = apiKey
    ? `key:${apiKey.slice(0, 12)}`
    : (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`);

  const rateLimitKey = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % RATE_LIMIT_WINDOW);
  const windowKey = `${rateLimitKey}:${windowStart}`;

  redis.multi()
    .incr(windowKey)
    .expire(windowKey, RATE_LIMIT_WINDOW * 2)
    .exec()
    .then((results) => {
      const current = results[0][1];
      const remaining = Math.max(0, DEFAULT_RATE_LIMIT - current);
      const resetAt = windowStart + RATE_LIMIT_WINDOW;

      res.setHeader('X-RateLimit-Limit', DEFAULT_RATE_LIMIT);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetAt);

      if (current > DEFAULT_RATE_LIMIT) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          limit: DEFAULT_RATE_LIMIT,
          reset_at: new Date(resetAt * 1000).toISOString(),
          retry_after: resetAt - now,
        });
      }

      // ── Track Usage in Redis ───────────────────────────────────────
      trackUsage(req, identifier).catch((err) => {
        logger.error('Usage tracking failed', { error: err.message });
      });

      next();
    })
    .catch((err) => {
      // If Redis is down, allow the request through
      logger.warn('Rate limit check failed, allowing request', { error: err.message });
      res.setHeader('X-RateLimit-Limit', DEFAULT_RATE_LIMIT);
      res.setHeader('X-RateLimit-Remaining', 'unknown');
      res.setHeader('X-RateLimit-Reset', 'unknown');
      next();
    });
}

/**
 * Track per-key/user API usage in Redis
 */
async function trackUsage(req, identifier) {
  const userId = req.user?.id;
  if (!userId) return;

  const endpoint = `${req.method}:${req.route?.path || req.path}`;
  const today = new Date().toISOString().split('T')[0];

  const pipeline = redis.pipeline();

  // Total requests counter
  pipeline.incr(`api_usage:total:${userId}`);

  // Per-endpoint counter
  pipeline.incr(`api_usage:endpoint:${userId}:${endpoint}`);

  // Daily counter (expire after 90 days)
  const dailyKey = `api_usage:daily:${userId}:${today}`;
  pipeline.incr(dailyKey);
  pipeline.expire(dailyKey, 90 * 86400);

  // Per-key counter if API key used
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const keyPrefix = apiKey.slice(0, 12);
    pipeline.incr(`api_usage:key:${keyPrefix}:total`);
    pipeline.incr(`api_usage:key:${keyPrefix}:${today}`);
    pipeline.expire(`api_usage:key:${keyPrefix}:${today}`, 90 * 86400);
  }

  await pipeline.exec();
}

export { CURRENT_API_VERSION, SUPPORTED_VERSIONS };
