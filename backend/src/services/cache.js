import redis from '../config/redis.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const CACHE_PREFIX = 'cache';
const SERVICES_TTL = 300;    // 5 minutes
const COUNTRIES_TTL = 300;   // 5 minutes

// ── Services cache ─────────────────────────────────────────────

export async function cacheServices() {
  try {
    const { rows } = await query(
      'SELECT * FROM services WHERE active = true ORDER BY name ASC'
    );
    await redis.set(
      `${CACHE_PREFIX}:services`,
      JSON.stringify(rows),
      'EX',
      SERVICES_TTL
    );
    logger.debug('Services cache populated', { count: rows.length });
    return rows;
  } catch (err) {
    logger.error('cacheServices failed', { error: err.message });
    return null;
  }
}

export async function getCachedServices() {
  try {
    const cached = await redis.get(`${CACHE_PREFIX}:services`);
    if (cached) {
      return JSON.parse(cached);
    }
    // Cache miss — fetch from DB and cache
    return await cacheServices();
  } catch (err) {
    logger.error('getCachedServices failed, falling back to DB', { error: err.message });
    const { rows } = await query(
      'SELECT * FROM services WHERE active = true ORDER BY name ASC'
    );
    return rows;
  }
}

// ── Countries cache ────────────────────────────────────────────

export async function cacheCountries() {
  try {
    const { rows } = await query(
      'SELECT DISTINCT country_code, country_name FROM services WHERE active = true ORDER BY country_name ASC'
    );
    await redis.set(
      `${CACHE_PREFIX}:countries`,
      JSON.stringify(rows),
      'EX',
      COUNTRIES_TTL
    );
    logger.debug('Countries cache populated', { count: rows.length });
    return rows;
  } catch (err) {
    logger.error('cacheCountries failed', { error: err.message });
    return null;
  }
}

export async function getCachedCountries() {
  try {
    const cached = await redis.get(`${CACHE_PREFIX}:countries`);
    if (cached) {
      return JSON.parse(cached);
    }
    return await cacheCountries();
  } catch (err) {
    logger.error('getCachedCountries failed, falling back to DB', { error: err.message });
    const { rows } = await query(
      'SELECT DISTINCT country_code, country_name FROM services WHERE active = true ORDER BY country_name ASC'
    );
    return rows;
  }
}

// ── Cache invalidation ─────────────────────────────────────────

export async function invalidateCache(pattern) {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Cache invalidated', { pattern, keysRemoved: keys.length });
    }
    return keys.length;
  } catch (err) {
    logger.error('invalidateCache failed', { error: err.message, pattern });
    return 0;
  }
}

// ── Cache warming ──────────────────────────────────────────────

export async function warmCache() {
  logger.info('Warming cache...');
  try {
    await Promise.all([
      cacheServices(),
      cacheCountries(),
    ]);
    logger.info('Cache warm-up complete');
  } catch (err) {
    logger.error('Cache warm-up failed', { error: err.message });
  }
}

export default {
  cacheServices,
  getCachedServices,
  cacheCountries,
  getCachedCountries,
  invalidateCache,
  warmCache,
};
