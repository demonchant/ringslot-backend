// authController.js — complete with device verification, welcome email, forgot/reset password
import bcrypt    from 'bcryptjs';
import jwt       from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query } from '../config/database.js';
import { hashDevice, generateToken, parseDeviceLabel } from '../utils/deviceFingerprint.js';
import { sendLoginVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────
function makeJWT(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// One-time check whether device tables exist (graceful fallback if migration not run)
let _tablesChecked = false;
let _tablesOK      = false;
async function deviceTablesOK() {
  if (_tablesChecked) return _tablesOK;
  try {
    await query('SELECT 1 FROM user_devices LIMIT 1');
    await query('SELECT 1 FROM login_tokens  LIMIT 1');
    _tablesOK      = true;
    logger.info('Device tables: OK');
  } catch {
    _tablesOK      = false;
    logger.warn('Device tables missing — run migrate_add_missing_tables.sql to enable device verification');
  }
  _tablesChecked = true;
  return _tablesOK;
}

const BLOCKED_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com',
  'sharklasers.com','yopmail.com','fakeinbox.com','mailnull.com',
  'trashmail.com','trashmail.me','dispostable.com','maildrop.cc',
  'getnada.com','moakt.com','10minutemail.com','10minutemail.net',
  'filzmail.com','emailondeck.com','getairmail.com','incognitomail.com',
  'guerrillamail.info','spam4.me','tempr.email','discard.email',
]);

// ── Register ──────────────────────────────────────────────────
export async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)  return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });

    const domain = email.split('@')[1]?.toLowerCase();
    if (BLOCKED_DOMAINS.has(domain)) return res.status(400).json({ error: 'Disposable email addresses are not allowed' });

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash   = await bcrypt.hash(password, 12);
    const apiKey = `rs_${uuid().replace(/-/g, '')}`;

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, api_key)
       VALUES ($1, $2, $3) RETURNING id, email, role, api_key`,
      [email.toLowerCase(), hash, apiKey]
    );
    const user = rows[0];
    await query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);

    logger.info('New user registered', { userId: user.id, email: user.email });

    // Send welcome email from noreply@ringslot.shop
    sendWelcomeEmail({ to: user.email })
      .then(r => {
        if (r.ok) logger.info('Welcome email sent', { userId: user.id });
        else logger.warn('Welcome email failed', { userId: user.id, error: r.error });
      })
      .catch(err => logger.warn('Welcome email error', { error: err.message }));

    return res.status(201).json({
      token:  makeJWT(user),
      apiKey: user.api_key,
      user:   { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    return res.status(500).json({ error: 'Registration failed' });
  }
}

// ── Login ─────────────────────────────────────────────────────
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

    // Skip device check if tables aren't set up yet
    const canVerify = await deviceTablesOK();
    if (!canVerify) {
      logger.warn('Device verification skipped — tables missing', { userId: user.id });
      return res.json({
        token:  makeJWT(user),
        apiKey: user.api_key,
        user:   { id: user.id, email: user.email, role: user.role },
      });
    }

    // Fingerprint this device
    const ip          = (req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
    const ua          = req.headers['user-agent'] || '';
    const deviceHash  = hashDevice(ip, ua);
    const deviceLabel = parseDeviceLabel(ua);

    // Check if device is known and trusted
    const { rows: devices } = await query(
      'SELECT id, verified FROM user_devices WHERE user_id = $1 AND device_hash = $2',
      [user.id, deviceHash]
    );
    const knownDevice  = devices[0];
    const isFirstLogin = !knownDevice;

    if (knownDevice?.verified) {
      // Trusted device — log in immediately, no email needed
      await query(
        'UPDATE user_devices SET last_seen_at = NOW(), ip_address = $1 WHERE id = $2',
        [ip, knownDevice.id]
      );
      logger.info('Login: trusted device', { userId: user.id, device: deviceLabel });
      return res.json({
        token:  makeJWT(user),
        apiKey: user.api_key,
        user:   { id: user.id, email: user.email, role: user.role },
      });
    }

    // New or unverified device — send verification email
    await query(
      `INSERT INTO user_devices (user_id, device_hash, ip_address, user_agent, label, verified)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       ON CONFLICT (user_id, device_hash)
       DO UPDATE SET ip_address = EXCLUDED.ip_address,
                     user_agent = EXCLUDED.user_agent,
                     last_seen_at = NOW()`,
      [user.id, deviceHash, ip, ua, deviceLabel]
    );

    // Delete old tokens for this device, create fresh one
    await query('DELETE FROM login_tokens WHERE user_id = $1 AND device_hash = $2', [user.id, deviceHash]);

    const verifyToken = generateToken(32);
    await query(
      `INSERT INTO login_tokens (user_id, token, device_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '15 minutes')`,
      [user.id, verifyToken, deviceHash, ip, ua]
    );

    // Send verification email — non-blocking
    sendLoginVerificationEmail({ to: user.email, token: verifyToken, deviceLabel, ip, isFirstLogin })
      .then(r => {
        if (r.ok) logger.info('Verification email sent', { userId: user.id, isFirstLogin, device: deviceLabel });
        else logger.warn('Verification email failed', { userId: user.id, error: r.error });
      })
      .catch(err => logger.warn('Verification email error', { error: err.message }));

    return res.status(202).json({
      requiresVerification: true,
      isFirstLogin,
      message: isFirstLogin
        ? 'Check your email to confirm your first sign-in.'
        : 'New device detected. Check your email to confirm this sign-in.',
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

// ── Verify device (email link click) ─────────────────────────
export async function verifyDevice(req, res) {
  const { token } = req.params;
  const FRONTEND  = process.env.FRONTEND_URL || 'https://ringslot.shop';
  if (!token) return res.redirect(`${FRONTEND}/login?verify=invalid`);

  try {
    const { rows } = await query(
      `SELECT lt.*, u.id AS uid, u.email, u.role, u.api_key, u.is_active
       FROM login_tokens lt
       JOIN users u ON u.id = lt.user_id
       WHERE lt.token = $1`,
      [token]
    );
    const r = rows[0];

    if (!r)            return res.redirect(`${FRONTEND}/login?verify=invalid`);
    if (r.used_at)     return res.redirect(`${FRONTEND}/login?verify=already_used`);
    if (!r.is_active)  return res.redirect(`${FRONTEND}/login?verify=disabled`);
    if (new Date(r.expires_at) < new Date()) return res.redirect(`${FRONTEND}/login?verify=expired`);

    // Mark used, mark device trusted
    await query('UPDATE login_tokens  SET used_at = NOW()    WHERE token = $1', [token]);
    await query('UPDATE user_devices  SET verified = TRUE, last_seen_at = NOW() WHERE user_id = $1 AND device_hash = $2',
      [r.user_id, r.device_hash]);

    const jwtToken = makeJWT({ id: r.uid, email: r.email, role: r.role });
    logger.info('Device verified', { userId: r.uid });

    return res.redirect(`${FRONTEND}/auth/callback?jwt=${jwtToken}&verified=true`);
  } catch (err) {
    logger.error('verifyDevice error', { error: err.message });
    return res.redirect(`${process.env.FRONTEND_URL || 'https://ringslot.shop'}/login?verify=error`);
  }
}

// ── Forgot password ───────────────────────────────────────────
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const OK = { message: 'If that email is registered you will receive a reset link shortly.' };

  try {
    const { rows } = await query(
      'SELECT id, email, is_active FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (!rows[0] || !rows[0].is_active) return res.json(OK);

    const user  = rows[0];
    const tok   = generateToken(32);

    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, tok]
    );

    sendPasswordResetEmail({ to: user.email, token: tok })
      .then(r => {
        if (r.ok) logger.info('Password reset email sent', { userId: user.id });
        else logger.warn('Password reset email failed', { userId: user.id, error: r.error });
      })
      .catch(err => logger.warn('Password reset email error', { error: err.message }));

    return res.json(OK);
  } catch (err) {
    logger.error('forgotPassword error', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Something went wrong.', detail: err.message });
  }
}

// ── Reset password ────────────────────────────────────────────
export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const { rows } = await query(
      `SELECT rt.*, u.email FROM password_reset_tokens rt
       JOIN users u ON u.id = rt.user_id WHERE rt.token = $1`,
      [token]
    );
    const r = rows[0];
    if (!r)        return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (r.used_at) return res.status(400).json({ error: 'This link has already been used' });
    if (new Date(r.expires_at) < new Date()) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });

    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, r.user_id]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token]);
    await query('DELETE FROM login_tokens WHERE user_id = $1', [r.user_id]); // force re-verify all devices

    logger.info('Password reset', { userId: r.user_id });
    return res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    logger.error('resetPassword error', { error: err.message });
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ── Validate reset token ──────────────────────────────────────
export async function validateResetToken(req, res) {
  try {
    const { rows } = await query(
      'SELECT expires_at, used_at FROM password_reset_tokens WHERE token = $1',
      [req.params.token]
    );
    const r = rows[0];
    if (!r || r.used_at || new Date(r.expires_at) < new Date()) return res.json({ valid: false });
    return res.json({ valid: true });
  } catch { return res.json({ valid: false }); }
}

// ── Get current user ──────────────────────────────────────────
export async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.api_key, u.created_at, w.balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE u.id = $1`,
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

// ── My devices ────────────────────────────────────────────────
export async function getMyDevices(req, res) {
  try {
    const { rows } = await query(
      `SELECT id, label, ip_address, verified, first_seen_at, last_seen_at
       FROM user_devices WHERE user_id = $1 ORDER BY last_seen_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch { return res.json([]); }
}

// ── Revoke device ─────────────────────────────────────────────
export async function revokeDevice(req, res) {
  try {
    const { rowCount } = await query(
      'DELETE FROM user_devices WHERE id = $1 AND user_id = $2',
      [req.params.deviceId, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Device not found' });
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'Failed to revoke device' }); }
}
