import { Router } from 'express';
import { query } from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createKey, revokeKey, rotateKey, getUserKeys,
} from '../services/apiKeys.js';
import {
  registerWebhook, removeWebhook, getUserWebhooks, WEBHOOK_EVENTS,
} from '../services/webhooks.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ── API Keys ──────────────────────────────────────────────────────

/**
 * GET /api/v1/keys — List user's API keys
 */
router.get('/keys', async (req, res) => {
  try {
    const keys = await getUserKeys(req.user.id);
    res.json({ keys });
  } catch (err) {
    logger.error('Failed to list API keys', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
});

/**
 * POST /api/v1/keys — Create a new API key
 * Body: { name: string, scopes?: string[] }
 */
router.post('/keys', async (req, res) => {
  try {
    const { name, scopes } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Key name must be 100 characters or less' });
    }

    const validScopes = ['read', 'orders', 'wallet'];
    if (scopes) {
      if (!Array.isArray(scopes)) {
        return res.status(400).json({ error: 'Scopes must be an array' });
      }
      const invalid = scopes.filter(s => !validScopes.includes(s));
      if (invalid.length) {
        return res.status(400).json({ error: `Invalid scopes: ${invalid.join(', ')}` });
      }
    }

    const key = await createKey(req.user.id, name.trim(), scopes || validScopes);
    res.status(201).json({ key });
  } catch (err) {
    logger.error('Failed to create API key', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * DELETE /api/v1/keys/:id — Revoke a key
 */
router.delete('/keys/:id', async (req, res) => {
  try {
    await revokeKey(req.params.id, req.user.id);
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('Failed to revoke API key', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * POST /api/v1/keys/:id/rotate — Rotate a key
 */
router.post('/keys/:id/rotate', async (req, res) => {
  try {
    const newKey = await rotateKey(req.params.id, req.user.id);
    res.json({ key: newKey });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('Failed to rotate API key', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

// ── Webhooks ──────────────────────────────────────────────────────

/**
 * GET /api/v1/webhooks — List user's webhooks
 */
router.get('/webhooks', async (req, res) => {
  try {
    const webhooks = await getUserWebhooks(req.user.id);
    res.json({ webhooks, available_events: WEBHOOK_EVENTS });
  } catch (err) {
    logger.error('Failed to list webhooks', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to retrieve webhooks' });
  }
});

/**
 * POST /api/v1/webhooks — Register a new webhook
 * Body: { url: string, events: string[] }
 */
router.post('/webhooks', async (req, res) => {
  try {
    const { url, events } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }

    if (!url.startsWith('https://')) {
      return res.status(400).json({ error: 'Webhook URL must use HTTPS' });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'At least one event is required' });
    }

    const invalid = events.filter(e => !WEBHOOK_EVENTS.includes(e));
    if (invalid.length) {
      return res.status(400).json({
        error: `Invalid events: ${invalid.join(', ')}`,
        available_events: WEBHOOK_EVENTS,
      });
    }

    const webhook = await registerWebhook(req.user.id, url, events);
    res.status(201).json({ webhook });
  } catch (err) {
    logger.error('Failed to register webhook', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

/**
 * DELETE /api/v1/webhooks/:id — Remove a webhook
 */
router.delete('/webhooks/:id', async (req, res) => {
  try {
    await removeWebhook(req.params.id, req.user.id);
    res.json({ success: true, message: 'Webhook removed' });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('Failed to remove webhook', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to remove webhook' });
  }
});

// ── Usage Stats ───────────────────────────────────────────────────

/**
 * GET /api/v1/usage — API usage statistics for the current user
 */
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.id;

    // Total requests from Redis
    const totalKey = `api_usage:total:${userId}`;
    const totalRequests = parseInt(await redis.get(totalKey) || '0', 10);

    // Per-endpoint breakdown
    const endpointPattern = `api_usage:endpoint:${userId}:*`;
    const endpointKeys = await redis.keys(endpointPattern);
    const byEndpoint = {};

    if (endpointKeys.length > 0) {
      const values = await redis.mget(endpointKeys);
      endpointKeys.forEach((key, i) => {
        const endpoint = key.split(':').slice(3).join(':');
        byEndpoint[endpoint] = parseInt(values[i] || '0', 10);
      });
    }

    // Per-day breakdown (last 30 days)
    const byDay = {};
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const dayKey = `api_usage:daily:${userId}:${dayStr}`;
      const count = parseInt(await redis.get(dayKey) || '0', 10);
      if (count > 0) byDay[dayStr] = count;
    }

    res.json({
      usage: {
        total_requests: totalRequests,
        by_endpoint: byEndpoint,
        by_day: byDay,
      },
    });
  } catch (err) {
    logger.error('Failed to get usage stats', { error: err.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to retrieve usage statistics' });
  }
});

export default router;
