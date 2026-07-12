/*
  SQL Migration — api_keys table:

  CREATE TABLE api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash      VARCHAR(128) NOT NULL UNIQUE,
    key_prefix    VARCHAR(16) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    scopes        JSONB NOT NULL DEFAULT '["read","orders","wallet"]',
    last_used_at  TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
  CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
*/

import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Generate a new API key in the format rs_live_<uuid>
 */
export function generateApiKey() {
  const id = uuidv4().replace(/-/g, '');
  return `rs_live_${id}`;
}

/**
 * Hash an API key for secure storage
 */
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new API key for a user
 */
export async function createKey(userId, name, scopes = ['read', 'orders', 'wallet']) {
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12); // rs_live_XXXX

  const { rows } = await query(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, scopes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, key_prefix, name, scopes, created_at`,
    [userId, keyHash, keyPrefix, name, JSON.stringify(scopes)]
  );

  logger.info('API key created', { userId, keyId: rows[0].id, name });

  return {
    ...rows[0],
    key: rawKey, // Only returned once at creation time
  };
}

/**
 * Revoke an API key (soft delete)
 */
export async function revokeKey(keyId, userId) {
  const { rows } = await query(
    `UPDATE api_keys
     SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [keyId, userId]
  );

  if (!rows.length) {
    throw new Error('Key not found or already revoked');
  }

  logger.info('API key revoked', { userId, keyId });
  return rows[0];
}

/**
 * Rotate an API key — generate new key, invalidate old one
 */
export async function rotateKey(keyId, userId) {
  const { rows: existing } = await query(
    `SELECT id, name, scopes FROM api_keys
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [keyId, userId]
  );

  if (!existing.length) {
    throw new Error('Key not found or already revoked');
  }

  // Revoke old key
  await query(
    `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1`,
    [keyId]
  );

  // Create new key with same name and scopes
  const { name, scopes } = existing[0];
  const newKey = await createKey(userId, name, scopes);

  logger.info('API key rotated', { userId, oldKeyId: keyId, newKeyId: newKey.id });
  return newKey;
}

/**
 * List a user's active (non-revoked) API keys
 */
export async function getUserKeys(userId) {
  const { rows } = await query(
    `SELECT id, key_prefix, name, scopes, last_used_at, created_at
     FROM api_keys
     WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

/**
 * Validate that an API key has the required scope.
 * Also updates last_used_at. Returns the key row if valid, null otherwise.
 */
export async function validateKeyScopes(apiKey, requiredScope) {
  const keyHash = hashKey(apiKey);

  const { rows } = await query(
    `SELECT ak.id, ak.user_id, ak.scopes, u.id AS uid, u.email, u.role
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1 AND ak.revoked_at IS NULL AND u.is_active = TRUE`,
    [keyHash]
  );

  if (!rows.length) return null;

  const keyRow = rows[0];
  const scopes = typeof keyRow.scopes === 'string' ? JSON.parse(keyRow.scopes) : keyRow.scopes;

  if (requiredScope && !scopes.includes(requiredScope)) {
    return null;
  }

  // Update last_used_at (fire and forget)
  query(
    `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
    [keyRow.id]
  ).catch(() => {});

  return {
    keyId: keyRow.id,
    userId: keyRow.user_id,
    email: keyRow.email,
    role: keyRow.role,
    scopes,
  };
}
