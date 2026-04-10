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
  max: 10,
  message: { error: 'Too many login attempts' },
});

export const buyLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Purchase rate limit exceeded' },
});


export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in 1 hour.' },
});
