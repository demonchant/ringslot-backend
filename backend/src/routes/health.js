import { Router } from 'express';
import pool from '../config/database.js';
import redis from '../config/redis.js';
import { getProviderHealthStats } from '../services/providerRouter.js';
import logger from '../utils/logger.js';

const router = Router();
const startedAt = Date.now();

/**
 * GET /api/health — Basic health check
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * GET /api/health/database — PostgreSQL connectivity check
 */
router.get('/health/database', async (_req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    res.json({ status: 'ok', latencyMs });
  } catch (err) {
    logger.error('Health check: database failed', { error: err.message });
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /api/health/redis — Redis connectivity check
 */
router.get('/health/redis', async (_req, res) => {
  try {
    const start = Date.now();
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;
    res.json({ status: pong === 'PONG' ? 'ok' : 'degraded', latencyMs });
  } catch (err) {
    logger.error('Health check: redis failed', { error: err.message });
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /api/health/providers — Provider health stats from circuit breaker
 */
router.get('/health/providers', (_req, res) => {
  try {
    const stats = getProviderHealthStats();
    const allHealthy = Object.values(stats).every(s => s.isAvailable);
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      providers: stats,
    });
  } catch (err) {
    logger.error('Health check: providers failed', { error: err.message });
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

export default router;
