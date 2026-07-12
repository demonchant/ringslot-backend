import redis from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Metrics collection service
 * Stores counters and time-series data in Redis with daily/hourly keys.
 */

const METRICS_PREFIX = 'metrics';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function hourKey() {
  const now = new Date();
  return `${todayKey()}:${String(now.getUTCHours()).padStart(2, '0')}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function weekKeys() {
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function monthKeys() {
  const keys = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

// ── Increment helpers ──────────────────────────────────────────

export async function incrementOrders(success = true) {
  const day = todayKey();
  const hour = hourKey();
  const pipeline = redis.pipeline();

  pipeline.hincrby(`${METRICS_PREFIX}:daily:${day}`, 'totalOrders', 1);
  pipeline.hincrby(`${METRICS_PREFIX}:hourly:${hour}`, 'totalOrders', 1);

  if (success) {
    pipeline.hincrby(`${METRICS_PREFIX}:daily:${day}`, 'successfulOrders', 1);
    pipeline.hincrby(`${METRICS_PREFIX}:hourly:${hour}`, 'successfulOrders', 1);
  } else {
    pipeline.hincrby(`${METRICS_PREFIX}:daily:${day}`, 'failedOrders', 1);
    pipeline.hincrby(`${METRICS_PREFIX}:hourly:${hour}`, 'failedOrders', 1);
  }

  // Expire keys after 90 days
  pipeline.expire(`${METRICS_PREFIX}:daily:${day}`, 90 * 86400);
  pipeline.expire(`${METRICS_PREFIX}:hourly:${hour}`, 7 * 86400);

  try {
    await pipeline.exec();
  } catch (err) {
    logger.error('metrics.incrementOrders failed', { error: err.message });
  }
}

export async function incrementRevenue(amount) {
  const day = todayKey();
  const hour = hourKey();
  const cents = Math.round(amount * 100); // store as integer cents for precision

  const pipeline = redis.pipeline();
  pipeline.hincrby(`${METRICS_PREFIX}:daily:${day}`, 'totalRevenue', cents);
  pipeline.hincrby(`${METRICS_PREFIX}:hourly:${hour}`, 'totalRevenue', cents);
  pipeline.expire(`${METRICS_PREFIX}:daily:${day}`, 90 * 86400);
  pipeline.expire(`${METRICS_PREFIX}:hourly:${hour}`, 7 * 86400);

  try {
    await pipeline.exec();
  } catch (err) {
    logger.error('metrics.incrementRevenue failed', { error: err.message });
  }
}

export async function incrementDeposits(amount) {
  const day = todayKey();
  const cents = Math.round(amount * 100);

  const pipeline = redis.pipeline();
  pipeline.hincrby(`${METRICS_PREFIX}:daily:${day}`, 'totalDeposits', cents);
  pipeline.expire(`${METRICS_PREFIX}:daily:${day}`, 90 * 86400);

  try {
    await pipeline.exec();
  } catch (err) {
    logger.error('metrics.incrementDeposits failed', { error: err.message });
  }
}

export async function trackActiveUser(userId) {
  const day = todayKey();
  try {
    await redis.sadd(`${METRICS_PREFIX}:activeUsers:${day}`, String(userId));
    await redis.expire(`${METRICS_PREFIX}:activeUsers:${day}`, 2 * 86400);
  } catch (err) {
    logger.error('metrics.trackActiveUser failed', { error: err.message });
  }
}

export async function recordProviderLatency(provider, ms) {
  const day = todayKey();
  const key = `${METRICS_PREFIX}:providerLatency:${provider}:${day}`;

  const pipeline = redis.pipeline();
  pipeline.lpush(key, String(ms));
  pipeline.ltrim(key, 0, 999); // keep last 1000 measurements
  pipeline.expire(key, 7 * 86400);

  try {
    await pipeline.exec();
  } catch (err) {
    logger.error('metrics.recordProviderLatency failed', { error: err.message });
  }
}

// ── Retrieval helpers ──────────────────────────────────────────

async function getDayMetrics(day) {
  try {
    const data = await redis.hgetall(`${METRICS_PREFIX}:daily:${day}`);
    const activeUsers = await redis.scard(`${METRICS_PREFIX}:activeUsers:${day}`);
    return {
      totalOrders: parseInt(data.totalOrders || '0', 10),
      successfulOrders: parseInt(data.successfulOrders || '0', 10),
      failedOrders: parseInt(data.failedOrders || '0', 10),
      totalRevenue: parseInt(data.totalRevenue || '0', 10) / 100,
      totalDeposits: parseInt(data.totalDeposits || '0', 10) / 100,
      activeUsers: activeUsers || 0,
    };
  } catch (err) {
    logger.error('metrics.getDayMetrics failed', { error: err.message, day });
    return { totalOrders: 0, successfulOrders: 0, failedOrders: 0, totalRevenue: 0, totalDeposits: 0, activeUsers: 0 };
  }
}

async function aggregateKeys(keys) {
  const totals = { totalOrders: 0, successfulOrders: 0, failedOrders: 0, totalRevenue: 0, totalDeposits: 0, activeUsers: 0 };
  for (const key of keys) {
    const dayData = await getDayMetrics(key);
    totals.totalOrders += dayData.totalOrders;
    totals.successfulOrders += dayData.successfulOrders;
    totals.failedOrders += dayData.failedOrders;
    totals.totalRevenue += dayData.totalRevenue;
    totals.totalDeposits += dayData.totalDeposits;
    totals.activeUsers += dayData.activeUsers;
  }
  return totals;
}

export async function getMetrics() {
  return getDayMetrics(todayKey());
}

export async function getDashboardMetrics() {
  const [today, yesterday, thisWeek, thisMonth] = await Promise.all([
    getDayMetrics(todayKey()),
    getDayMetrics(yesterdayKey()),
    aggregateKeys(weekKeys()),
    aggregateKeys(monthKeys()),
  ]);

  return { today, yesterday, thisWeek, thisMonth };
}

export default {
  incrementOrders,
  incrementRevenue,
  incrementDeposits,
  trackActiveUser,
  recordProviderLatency,
  getMetrics,
  getDashboardMetrics,
};
