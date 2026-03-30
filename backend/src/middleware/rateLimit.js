import rateLimit from 'express-rate-limit';
import { query } from '../config/database.js';

export async function blockIpMiddleware(req, res, next) {
  const ip = req.ip;
  try {
    const { rows } = await query('SELECT id FROM blocked_ips WHERE ip_address = $1', [ip]);
    if (rows.length) return res.status(403).json({ error: 'Access denied' });
  } catch {}
  next();
}

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});

// Separate looser limiter just for forgot-password (doesn't need to be as strict)
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hour window
  max: 5,                // 5 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
});

export const buyLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Purchase rate limit exceeded' },
});
