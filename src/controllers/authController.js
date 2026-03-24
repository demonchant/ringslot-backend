import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query } from '../config/database.js';

function token(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Strict email format validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Block disposable/temporary email domains
    const blockedDomains = new Set([
      'mailinator.com','guerrillamail.com','tempmail.com','throwam.com',
      'sharklasers.com','yopmail.com','fakeinbox.com','mailnull.com',
      'trashmail.com','trashmail.me','dispostable.com','maildrop.cc',
      'getnada.com','moakt.com','mohmal.com','tempmailaddress.com',
      'tmpmail.net','tmpmail.org','10minutemail.com','10minutemail.net',
      'filzmail.com','emailondeck.com','getairmail.com','incognitomail.com',
      'guerrillamail.info','spam4.me','tempr.email','discard.email',
      'mytemp.email','spamgourmet.com','spamgourmet.net','spamgourmet.org',
    ]);
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (blockedDomains.has(emailDomain)) {
      return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const apiKey = `rs_${uuid().replace(/-/g, '')}`;

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, api_key) VALUES ($1,$2,$3) RETURNING id, email, role, api_key`,
      [email.toLowerCase(), hash, apiKey]
    );
    const user = rows[0];
    await query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);

    return res.status(201).json({ token: token(user), apiKey: user.api_key, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed' });
  }
}

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

    return res.json({ token: token(user), apiKey: user.api_key, user: { id: user.id, email: user.email, role: user.role } });
  } catch {
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.api_key, u.created_at, w.balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE u.id = $1`,
    [req.user.id]
  );
  return res.json(rows[0]);
}

export async function regenerateKey(req, res) {
  const newKey = `rs_${uuid().replace(/-/g, '')}`;
  await query('UPDATE users SET api_key = $1 WHERE id = $2', [newKey, req.user.id]);
  return res.json({ apiKey: newKey });
}
