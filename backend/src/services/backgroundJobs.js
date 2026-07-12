import { query } from '../config/database.js';
import { getProviderBalances } from './providerRouter.js';
import logger from '../utils/logger.js';

let intervalIds = [];

/**
 * Cancel orders older than 15 minutes that are still in 'waiting' status.
 */
async function cleanupExpiredOrders() {
  try {
    const result = await query(
      `UPDATE orders
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'waiting'
         AND created_at < NOW() - INTERVAL '15 minutes'
       RETURNING id`
    );
    if (result.rowCount > 0) {
      logger.info(`Background job: expired ${result.rowCount} stale orders`);
    }
  } catch (err) {
    logger.error('Background job: cleanupExpiredOrders failed', { error: err.message });
  }
}

/**
 * Check provider balances and log warnings if any is below $5.
 */
async function checkProviderBalances() {
  try {
    const balances = await getProviderBalances();
    for (const [provider, balance] of Object.entries(balances)) {
      if (balance !== null && balance < 5) {
        logger.warn(`Low provider balance: ${provider} = $${balance}`);
      }
    }
  } catch (err) {
    logger.error('Background job: checkProviderBalances failed', { error: err.message });
  }
}

/**
 * Delete login_tokens older than 30 days.
 */
async function cleanupStaleSessions() {
  try {
    const result = await query(
      `DELETE FROM login_tokens
       WHERE created_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );
    if (result.rowCount > 0) {
      logger.info(`Background job: cleaned ${result.rowCount} stale login tokens`);
    }
  } catch (err) {
    logger.error('Background job: cleanupStaleSessions failed', { error: err.message });
  }
}

/**
 * Start all background jobs. Returns cleanup function for graceful shutdown.
 */
export function startBackgroundJobs() {
  logger.info('Background jobs started');

  // Expired order cleanup — every 5 minutes
  intervalIds.push(setInterval(cleanupExpiredOrders, 5 * 60 * 1000));

  // Provider balance check — every 10 minutes
  intervalIds.push(setInterval(checkProviderBalances, 10 * 60 * 1000));

  // Stale session cleanup — every hour
  intervalIds.push(setInterval(cleanupStaleSessions, 60 * 60 * 1000));

  // Run cleanup once on startup after a short delay
  setTimeout(cleanupExpiredOrders, 10_000);
}

/**
 * Stop all background job intervals.
 */
export function stopBackgroundJobs() {
  for (const id of intervalIds) {
    clearInterval(id);
  }
  intervalIds = [];
  logger.info('Background jobs stopped');
}
