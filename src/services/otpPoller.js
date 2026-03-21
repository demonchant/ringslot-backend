import { query, getClient } from '../config/database.js';
import { checkStatus } from './providerRouter.js';
import { parseOTP } from '../utils/smsParser.js';
import logger from '../utils/logger.js';

const INTERVAL_MS = 5000;
const MAX_POLLS = 24; // 2 minutes before auto-refund

export async function enqueue(orderId, provider, providerOrderId) {
  await query(
    `INSERT INTO otp_poll_queue (order_id, provider, provider_order_id)
     VALUES ($1, $2, $3) ON CONFLICT (order_id) DO NOTHING`,
    [orderId, provider, providerOrderId]
  );
}

export async function dequeue(orderId) {
  await query('DELETE FROM otp_poll_queue WHERE order_id = $1', [orderId]);
}

async function tick() {
  const { rows } = await query(`
    SELECT q.order_id, q.provider, q.provider_order_id, q.poll_count,
           o.user_id, o.user_price
    FROM otp_poll_queue q
    JOIN orders o ON o.id = q.order_id
    WHERE q.next_poll_at <= NOW() AND o.status = 'waiting'
    LIMIT 50
  `);

  await Promise.allSettled(rows.map(async (row) => {
    try {
      const { status, sms } = await checkStatus(row.provider, row.provider_order_id);

      if (status === 'received' && sms) {
        await query(
          `UPDATE orders SET status = 'received', otp = $1, updated_at = NOW() WHERE id = $2`,
          [parseOTP(sms), row.order_id]
        );
        await dequeue(row.order_id);
        return;
      }

      if (status === 'cancelled') {
        await query(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [row.order_id]);
        await dequeue(row.order_id);
        return;
      }

      const newCount = row.poll_count + 1;
      if (newCount >= MAX_POLLS) {
        await refundExpired(row.order_id, row.user_id, row.user_price);
        await dequeue(row.order_id);
        return;
      }

      await query(
        `UPDATE otp_poll_queue SET poll_count = $1, next_poll_at = NOW() + interval '5 seconds' WHERE order_id = $2`,
        [newCount, row.order_id]
      );
    } catch (err) {
      logger.warn('Poll error', { orderId: row.order_id, error: err.message });
    }
  }));
}

async function refundExpired(orderId, userId, amount) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE orders SET status = 'expired', updated_at = NOW() WHERE id = $1`, [orderId]);
    await client.query(`UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`, [amount, userId]);
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, reference) VALUES ($1, $2, 'refund', $3)`,
      [userId, amount, `Auto-refund expired ${orderId}`]
    );
    await client.query('COMMIT');
    logger.info('Auto-refunded expired order', { orderId, amount });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Refund failed', { orderId, error: err.message });
  } finally {
    client.release();
  }
}

export function startPoller() {
  logger.info('OTP poller started');
  setInterval(async () => {
    try { await tick(); } catch (err) { logger.error('Poller tick error', { error: err.message }); }
  }, INTERVAL_MS);
}

export async function recoverPending() {
  const { rows } = await query(`
    SELECT o.id, o.provider, o.provider_order_id
    FROM orders o LEFT JOIN otp_poll_queue q ON q.order_id = o.id
    WHERE o.status = 'waiting' AND q.order_id IS NULL
      AND o.created_at > NOW() - INTERVAL '10 minutes'
  `);
  for (const r of rows) await enqueue(r.id, r.provider, r.provider_order_id);
  if (rows.length) logger.info(`Recovered ${rows.length} pending orders into queue`);
}
