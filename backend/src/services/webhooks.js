/*
  SQL Migration — webhooks and webhook_deliveries tables:

  CREATE TABLE webhooks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         VARCHAR(2048) NOT NULL,
    events      JSONB NOT NULL DEFAULT '[]',
    secret      VARCHAR(128) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_webhooks_user ON webhooks(user_id) WHERE is_active = TRUE;
  CREATE INDEX idx_webhooks_events ON webhooks USING gin(events) WHERE is_active = TRUE;

  CREATE TABLE webhook_deliveries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id    UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event         VARCHAR(50) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts      INTEGER NOT NULL DEFAULT 0,
    max_attempts  INTEGER NOT NULL DEFAULT 3,
    last_error    TEXT,
    response_code INTEGER,
    next_retry_at TIMESTAMPTZ,
    delivered_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_deliveries_pending ON webhook_deliveries(next_retry_at)
    WHERE status = 'pending' OR status = 'retrying';
  CREATE INDEX idx_deliveries_webhook ON webhook_deliveries(webhook_id);
*/

import crypto from 'node:crypto';
import axios from 'axios';
import { query } from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';

// Supported webhook events
export const WEBHOOK_EVENTS = [
  'order.created',
  'order.completed',
  'otp.received',
  'order.cancelled',
  'deposit.confirmed',
  'deposit.failed',
];

/**
 * Register a new webhook endpoint for a user
 */
export async function registerWebhook(userId, url, events, secret) {
  // Validate events
  const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
  if (invalidEvents.length) {
    throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
  }

  // Generate secret if not provided
  const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

  const { rows } = await query(
    `INSERT INTO webhooks (user_id, url, events, secret)
     VALUES ($1, $2, $3, $4)
     RETURNING id, url, events, is_active, created_at`,
    [userId, url, JSON.stringify(events), webhookSecret]
  );

  logger.info('Webhook registered', { userId, webhookId: rows[0].id, url });

  return {
    ...rows[0],
    secret: webhookSecret, // Only returned once at creation
  };
}

/**
 * Remove a webhook endpoint
 */
export async function removeWebhook(webhookId, userId) {
  const { rows } = await query(
    `UPDATE webhooks SET is_active = FALSE
     WHERE id = $1 AND user_id = $2 AND is_active = TRUE
     RETURNING id`,
    [webhookId, userId]
  );

  if (!rows.length) {
    throw new Error('Webhook not found or already removed');
  }

  logger.info('Webhook removed', { userId, webhookId });
  return rows[0];
}

/**
 * List a user's active webhooks
 */
export async function getUserWebhooks(userId) {
  const { rows } = await query(
    `SELECT id, url, events, is_active, created_at
     FROM webhooks
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

/**
 * Deliver an event to all matching webhooks for a user.
 * Queues deliveries for background processing.
 */
export async function deliverEvent(event, payload, userId) {
  if (!WEBHOOK_EVENTS.includes(event)) {
    logger.warn('Attempted to deliver unknown webhook event', { event, userId });
    return [];
  }

  // Find matching webhooks
  const { rows: webhooks } = await query(
    `SELECT id, url, secret FROM webhooks
     WHERE user_id = $1 AND is_active = TRUE AND events ? $2`,
    [userId, event]
  );

  if (!webhooks.length) return [];

  // Queue deliveries
  const deliveryIds = [];
  for (const webhook of webhooks) {
    const { rows } = await query(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, next_retry_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [webhook.id, event, JSON.stringify(payload)]
    );
    deliveryIds.push(rows[0].id);
  }

  // Notify background processor via Redis
  await redis.publish('webhook:deliver', JSON.stringify({ deliveryIds }));

  logger.info('Webhook deliveries queued', { event, userId, count: deliveryIds.length });
  return deliveryIds;
}

/**
 * Process pending webhook deliveries (background job)
 */
export async function processWebhookQueue() {
  const { rows: pending } = await query(
    `SELECT wd.id, wd.webhook_id, wd.event, wd.payload, wd.attempts, wd.max_attempts,
            w.url, w.secret
     FROM webhook_deliveries wd
     JOIN webhooks w ON w.id = wd.webhook_id
     WHERE (wd.status = 'pending' OR wd.status = 'retrying')
       AND wd.next_retry_at <= NOW()
     ORDER BY wd.next_retry_at ASC
     LIMIT 50`
  );

  let processed = 0;
  let failed = 0;

  for (const delivery of pending) {
    try {
      const payload = typeof delivery.payload === 'string'
        ? JSON.parse(delivery.payload)
        : delivery.payload;

      const body = {
        id: delivery.id,
        event: delivery.event,
        payload,
        timestamp: new Date().toISOString(),
      };

      const signature = signPayload(JSON.stringify(body), delivery.secret);

      const response = await axios.post(delivery.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-RingSlot-Signature': signature,
          'X-RingSlot-Event': delivery.event,
          'X-RingSlot-Delivery': delivery.id,
        },
        timeout: 10000,
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        // Success
        await query(
          `UPDATE webhook_deliveries
           SET status = 'delivered', delivered_at = NOW(), response_code = $2, attempts = attempts + 1
           WHERE id = $1`,
          [delivery.id, response.status]
        );
        processed++;
      } else {
        // Non-2xx response
        await handleDeliveryFailure(delivery, `HTTP ${response.status}`, response.status);
        failed++;
      }
    } catch (err) {
      await handleDeliveryFailure(delivery, err.message, null);
      failed++;
    }
  }

  if (pending.length > 0) {
    logger.info('Webhook queue processed', { total: pending.length, processed, failed });
  }

  return { processed, failed, total: pending.length };
}

/**
 * Handle a failed delivery attempt — retry or mark as failed
 */
async function handleDeliveryFailure(delivery, errorMessage, responseCode) {
  const nextAttempt = delivery.attempts + 1;

  if (nextAttempt >= delivery.max_attempts) {
    await query(
      `UPDATE webhook_deliveries
       SET status = 'failed', last_error = $2, response_code = $3, attempts = $4
       WHERE id = $1`,
      [delivery.id, errorMessage, responseCode, nextAttempt]
    );
    logger.warn('Webhook delivery failed permanently', {
      deliveryId: delivery.id,
      webhookId: delivery.webhook_id,
      error: errorMessage,
    });
  } else {
    // Exponential backoff: 30s, 120s, 480s...
    const delaySeconds = 30 * Math.pow(4, nextAttempt - 1);
    await query(
      `UPDATE webhook_deliveries
       SET status = 'retrying', last_error = $2, response_code = $3,
           attempts = $4, next_retry_at = NOW() + INTERVAL '${delaySeconds} seconds'
       WHERE id = $1`,
      [delivery.id, errorMessage, responseCode, nextAttempt]
    );
  }
}

/**
 * Sign a payload with HMAC-SHA256 for webhook verification
 */
export function signPayload(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}
