// src/controllers/authController.js
import bcrypt    from 'bcryptjs';
import jwt       from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query } from '../config/database.js';
import { hashDevice, generateToken, parseDeviceLabel } from '../utils/deviceFingerprint.js';
import { sendLoginVerificationEmail, sendWelcomeEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

// ── JWT helper ────────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── Blocked disposable domains ────────────────────────────────
const BLOCKED_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com',
  'sharklasers.com','yopmail.com','fakeinbox.com','mailnull.com',
  'trashmail.com','trashmail.me','dispostable.com','maildrop.cc',
  'getnada.com','moakt.com','mohmal.com','tempmailaddress.com',
  'tmpmail.net','tmpmail.org','10minutemail.com','10minutemail.net',
  'filzmail.com','emailondeck.com','getairmail.com','incognitomail.com',
  'guerrillamail.info','spam4.me','tempr.email','discard.email',
  'mytemp.email','spamgourmet.com','spamgourmet.net','spamgourmet.org',
]);

// ── Register ──────────────────────────────────────────────────
export async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    const domain = email.split('@')[1]?.toLowerCase();
    if (BLOCKED_DOMAINS.has(domain)) {
      return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash   = await bcrypt.hash(password, 12);
    const apiKey = `rs_${uuid().replace(/-/g, '')}`;

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, api_key)
       VALUES ($1,$2,$3) RETURNING id, email, role, api_key`,
      [email.toLowerCase(), hash, apiKey]
    );
    const user = rows[0];
    await query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);

    // Send welcome email — fire and forget
    sendWelcomeEmail({ to: user.email }).catch((err) =>
      logger.warn('Welcome email failed', { error: err.message })
    );

    return res.status(201).json({
      token:  makeToken(user),
      apiKey: user.api_key,
      user:   { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    return res.status(500).json({ error: 'Registration failed' });
  }
}

// ── Login — with device verification ─────────────────────────
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query(
      'SELECT id, email, password_hash, role, api_key, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // ── Device fingerprint ───────────────────────────────────
    const ip          = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const ua          = req.headers['user-agent'] || '';
    const deviceHash  = hashDevice(ip, ua);
    const deviceLabel = parseDeviceLabel(ua);

    // Check if this device is already known and verified for this user
    const { rows: devices } = await query(
      `SELECT id, verified FROM user_devices
       WHERE user_id = $1 AND device_hash = $2`,
      [user.id, deviceHash]
    );

    const knownDevice  = devices[0];
    const isFirstLogin = !knownDevice; // true if never seen this device before

    if (knownDevice?.verified) {
      // ✅ Known & trusted device — update last_seen and issue token immediately
      await query(
        `UPDATE user_devices SET last_seen_at = NOW(), ip_address = $1 WHERE id = $2`,
        [ip, knownDevice.id]
      );
      return res.json({
        token:  makeToken(user),
        apiKey: user.api_key,
        user:   { id: user.id, email: user.email, role: user.role },
      });
    }

    // ── New or unverified device — require email confirmation ──
    // Upsert the device record (unverified)
    await query(
      `INSERT INTO user_devices (user_id, device_hash, ip_address, user_agent, label, verified)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       ON CONFLICT (user_id, device_hash)
       DO UPDATE SET ip_address = EXCLUDED.ip_address,
                     user_agent = EXCLUDED.user_agent,
                     last_seen_at = NOW()`,
      [user.id, deviceHash, ip, ua, deviceLabel]
    );

    // Create a one-time verification token (expire old ones first)
    await query(
      `DELETE FROM login_tokens WHERE user_id = $1 AND device_hash = $2`,
      [user.id, deviceHash]
    );

    const token     = generateToken(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await query(
      `INSERT INTO login_tokens
         (user_id, token, device_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, token, deviceHash, ip, ua, expiresAt]
    );

    // Send verification email
    sendLoginVerificationEmail({
      to:          user.email,
      token,
      deviceLabel,
      ip,
      isFirstLogin,
    }).catch((err) => logger.warn('Device verify email failed', { error: err.message }));

    logger.info('New device login — verification email sent', {
      userId:   user.id,
      device:   deviceLabel,
      ip,
      isFirstLogin,
    });

    // Return 202 so the frontend can show "check your email"
    return res.status(202).json({
      requiresVerification: true,
      isFirstLogin,
      message: isFirstLogin
        ? 'Check your email to confirm your first sign-in.'
        : 'New device detected. Check your email to confirm this sign-in.',
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    return res.status(500).json({ error: 'Login failed' });
  }
}

// ── Verify device via email link ──────────────────────────────
export async function verifyDevice(req, res) {
  const { token } = req.params;

  if (!token) {
    return res.redirect(`${process.env.FRONTEND_URL || 'https://ringslot.shop'}/login?verify=invalid`);
  }

  try {
    // Look up the token
    const { rows: tokenRows } = await query(
      `SELECT lt.*, u.id AS uid, u.email, u.role, u.api_key, u.is_active
       FROM login_tokens lt
       JOIN users u ON u.id = lt.user_id
       WHERE lt.token = $1`,
      [token]
    );

    const record = tokenRows[0];
    const FRONTEND = process.env.FRONTEND_URL || 'https://ringslot.shop';

    if (!record) {
      return res.redirect(`${FRONTEND}/login?verify=invalid`);
    }

    if (record.used_at) {
      return res.redirect(`${FRONTEND}/login?verify=already_used`);
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.redirect(`${FRONTEND}/login?verify=expired`);
    }

    if (!record.is_active) {
      return res.redirect(`${FRONTEND}/login?verify=disabled`);
    }

    // ✅ Mark token as used
    await query(
      `UPDATE login_tokens SET used_at = NOW() WHERE token = $1`,
      [token]
    );

    // ✅ Mark device as verified
    await query(
      `UPDATE user_devices SET verified = TRUE, last_seen_at = NOW()
       WHERE user_id = $1 AND device_hash = $2`,
      [record.user_id, record.device_hash]
    );

    // Issue a real JWT and redirect to dashboard with it in URL fragment
    // The frontend picks it up, stores it in localStorage, and clears the URL
    const jwtToken = makeToken({
      id:    record.uid,
      email: record.email,
      role:  record.role,
    });

    logger.info('Device verified via email link', {
      userId: record.uid,
      device: record.device_hash,
    });

    // Redirect to frontend with token — frontend reads ?jwt= and stores it
    return res.redirect(`${FRONTEND}/auth/callback?jwt=${jwtToken}&verified=true`);
  } catch (err) {
    logger.error('verifyDevice error', { error: err.message });
    return res.redirect(`${process.env.FRONTEND_URL || 'https://ringslot.shop'}/login?verify=error`);
  }
}

// ── Get current user ──────────────────────────────────────────
export async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.api_key, u.created_at, w.balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  return res.json(rows[0]);
}

// ── Regenerate API key ────────────────────────────────────────
export async function regenerateKey(req, res) {
  const newKey = `rs_${uuid().replace(/-/g, '')}`;
  await query('UPDATE users SET api_key = $1 WHERE id = $2', [newKey, req.user.id]);
  return res.json({ apiKey: newKey });
}

// ── List verified devices for this user ───────────────────────
export async function getMyDevices(req, res) {
  const { rows } = await query(
    `SELECT id, label, ip_address, verified, first_seen_at, last_seen_at
     FROM user_devices WHERE user_id = $1 ORDER BY last_seen_at DESC`,
    [req.user.id]
  );
  return res.json(rows);
}

// ── Revoke a device (removes trust, forces re-verification) ──
export async function revokeDevice(req, res) {
  const { deviceId } = req.params;
  const { rowCount } = await query(
    `DELETE FROM user_devices WHERE id = $1 AND user_id = $2`,
    [deviceId, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Device not found' });
  return res.json({ success: true });
}

// ── Forgot password — send reset link ────────────────────────
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { rows } = await query(
      'SELECT id, email, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return 200 — never reveal whether an email exists
    if (!rows[0] || !rows[0].is_active) {
      return res.json({ message: 'If that email is registered you will receive a reset link shortly.' });
    }

    const user  = rows[0];
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    const { sendPasswordResetEmail } = await import('../utils/email.js');
    sendPasswordResetEmail({ to: user.email, token }).catch((err) =>
      logger.warn('Password reset email failed', { error: err.message })
    );

    logger.info('Password reset requested', { userId: user.id });
    return res.json({ message: 'If that email is registered you will receive a reset link shortly.' });
  } catch (err) {
    logger.error('forgotPassword error', { error: err.message });
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// ── Reset password — consume token and set new password ──────
export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const { rows } = await query(
      `SELECT rt.*, u.email FROM password_reset_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1`,
      [token]
    );

    const record = rows[0];
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (record.used_at) return res.status(400).json({ error: 'This link has already been used' });
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, record.user_id]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token]);

    // Invalidate all login tokens for this user (security: someone may have compromised the account)
    await query('DELETE FROM login_tokens WHERE user_id = $1', [record.user_id]);

    logger.info('Password reset completed', { userId: record.user_id });
    return res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    logger.error('resetPassword error', { error: err.message });
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// ── Validate reset token (frontend calls this to check if token is still valid) ──
export async function validateResetToken(req, res) {
  const { token } = req.params;
  const { rows } = await query(
    `SELECT expires_at, used_at FROM password_reset_tokens WHERE token = $1`,
    [token]
  );
  const r = rows[0];
  if (!r || r.used_at || new Date(r.expires_at) < new Date()) {
    return res.json({ valid: false });
  }
  return res.json({ valid: true });
}
