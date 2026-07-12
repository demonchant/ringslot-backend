/*
 * ── SQL Migration (run manually) ──────────────────────────────────────────────
 *
 * CREATE TABLE IF NOT EXISTS notifications (
 *   id            SERIAL PRIMARY KEY,
 *   user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   type          VARCHAR(50) NOT NULL DEFAULT 'system_alert',
 *   title         VARCHAR(255) NOT NULL,
 *   message       TEXT NOT NULL,
 *   is_read       BOOLEAN NOT NULL DEFAULT FALSE,
 *   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_notifications_user_id ON notifications(user_id);
 * CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
 * CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
 *
 */

import { query } from '../config/database.js';
import logger from '../utils/logger.js';

// Valid notification types
const NOTIFICATION_TYPES = [
  'order_completed',
  'otp_received',
  'deposit_confirmed',
  'system_alert',
];

/**
 * Create a new notification for a user.
 * @param {number} userId
 * @param {string} type - One of NOTIFICATION_TYPES
 * @param {string} title
 * @param {string} message
 * @returns {object|null} The created notification row
 */
export async function createNotification(userId, type, title, message) {
  if (!NOTIFICATION_TYPES.includes(type)) {
    logger.warn('createNotification: invalid type', { type, userId });
    type = 'system_alert';
  }

  try {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, type, title, message]
    );
    return rows[0];
  } catch (err) {
    logger.error('createNotification failed', { error: err.message, userId, type });
    return null;
  }
}

/**
 * Get notifications for a user, most recent first.
 * @param {number} userId
 * @param {number} limit - Max notifications to return (default 20)
 * @returns {Array}
 */
export async function getUserNotifications(userId, limit = 20) {
  try {
    const { rows } = await query(
      `SELECT id, type, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  } catch (err) {
    logger.error('getUserNotifications failed', { error: err.message, userId });
    return [];
  }
}

/**
 * Mark a single notification as read.
 * @param {number} notificationId
 * @returns {boolean}
 */
export async function markAsRead(notificationId) {
  try {
    const { rowCount } = await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
      [notificationId]
    );
    return rowCount > 0;
  } catch (err) {
    logger.error('markAsRead failed', { error: err.message, notificationId });
    return false;
  }
}

/**
 * Mark all notifications for a user as read.
 * @param {number} userId
 * @returns {number} Number of notifications marked
 */
export async function markAllRead(userId) {
  try {
    const { rowCount } = await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return rowCount;
  } catch (err) {
    logger.error('markAllRead failed', { error: err.message, userId });
    return 0;
  }
}

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllRead,
  NOTIFICATION_TYPES,
};
