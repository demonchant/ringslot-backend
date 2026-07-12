import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// ── Alert configuration ───────────────────────────────────────
const ALERTS_KEY = 'intelligence:alerts';
const ALERTS_MAX = 500; // keep last 500 alerts in Redis
const DEBOUNCE_TTL = 15 * 60; // 15 minutes debounce per type+provider

const VALID_LEVELS = ['info', 'warning', 'critical'];
const VALID_TYPES = [
  'provider_down',
  'price_spike',
  'low_balance',
  'high_failure_rate',
  'inventory_shortage',
  'suspicious_activity',
];

// ── Create an alert ───────────────────────────────────────────
export async function createAlert(level, type, message, meta = {}) {
  if (!VALID_LEVELS.includes(level)) {
    logger.warn('Invalid alert level', { level });
    return null;
  }

  const alert = {
    id: crypto.randomUUID(),
    level,
    type,
    message,
    meta,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const pipeline = redis.pipeline();
    pipeline.lpush(ALERTS_KEY, JSON.stringify(alert));
    pipeline.ltrim(ALERTS_KEY, 0, ALERTS_MAX - 1);
    pipeline.expire(ALERTS_KEY, 30 * 86400); // 30 days retention
    await pipeline.exec();
  } catch (err) {
    logger.error('Failed to store alert in Redis', { error: err.message });
  }

  // Log to Winston at appropriate level
  const logFn = level === 'critical' ? logger.error : level === 'warning' ? logger.warn : logger.info;
  logFn.call(logger, `[ALERT:${level.toUpperCase()}] ${type}: ${message}`, { alertId: alert.id, ...meta });

  return alert;
}

// ── Get recent alerts ─────────────────────────────────────────
export async function getRecentAlerts(limit = 50) {
  try {
    const raw = await redis.lrange(ALERTS_KEY, 0, limit - 1);
    return raw.map((item) => {
      try { return JSON.parse(item); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    logger.error('Failed to fetch alerts', { error: err.message });
    return [];
  }
}

// ── Acknowledge an alert ──────────────────────────────────────
export async function acknowledgeAlert(alertId) {
  try {
    const raw = await redis.lrange(ALERTS_KEY, 0, -1);
    let found = false;

    for (let i = 0; i < raw.length; i++) {
      try {
        const alert = JSON.parse(raw[i]);
        if (alert.id === alertId) {
          alert.acknowledged = true;
          alert.acknowledgedAt = new Date().toISOString();
          await redis.lset(ALERTS_KEY, i, JSON.stringify(alert));
          found = true;
          break;
        }
      } catch {
        // skip malformed entries
      }
    }

    return found;
  } catch (err) {
    logger.error('Failed to acknowledge alert', { error: err.message, alertId });
    return false;
  }
}

// ── Debounce: don't re-alert same issue within 15 minutes ─────
export async function shouldAlert(type, provider) {
  const debounceKey = `intelligence:alert_debounce:${type}:${provider || 'global'}`;
  try {
    const exists = await redis.exists(debounceKey);
    if (exists) return false;

    await redis.setex(debounceKey, DEBOUNCE_TTL, '1');
    return true;
  } catch (err) {
    logger.error('Alert debounce check failed', { error: err.message });
    // If debounce check fails, allow the alert (fail open)
    return true;
  }
}

export default {
  createAlert,
  getRecentAlerts,
  acknowledgeAlert,
  shouldAlert,
  VALID_LEVELS,
  VALID_TYPES,
};
