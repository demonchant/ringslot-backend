import logger from '../utils/logger.js';
import { query } from '../config/database.js';
import { clearMarkupCache } from '../services/markupEngine.js';

export async function getStats(req, res) {
  const [rev, users, orders] = await Promise.all([
    query(`SELECT COALESCE(SUM(profit),0) AS profit, COALESCE(SUM(user_paid),0) AS revenue, COUNT(*) AS orders FROM platform_revenue`),
    query(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'user'`),
    query(`SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status`),
  ]);
  const byStatus = {};
  orders.rows.forEach((r) => (byStatus[r.status] = parseInt(r.cnt)));
  return res.json({
    totalProfit: parseFloat(rev.rows[0].profit),
    totalRevenue: parseFloat(rev.rows[0].revenue),
    totalOrders: parseInt(rev.rows[0].orders),
    totalUsers: parseInt(users.rows[0].cnt),
    ordersByStatus: byStatus,
  });
}

export async function getDailyRevenue(req, res) {
  const { rows } = await query(`
    SELECT DATE(created_at) AS date, COUNT(*) AS orders,
           ROUND(SUM(profit)::numeric,4) AS profit,
           ROUND(SUM(user_paid)::numeric,4) AS revenue
    FROM platform_revenue
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at) ORDER BY date DESC
  `);
  return res.json(rows);
}

export async function setMarkup(req, res) {
  const { service, markup } = req.body;
  if (!service || !markup || parseFloat(markup) < 1) {
    return res.status(400).json({ error: 'service and markup >= 1.0 required' });
  }
  await query('UPDATE services SET markup = $1 WHERE service_key = $2', [markup, service]);
  await clearMarkupCache(service);
  return res.json({ success: true });
}

export async function getProviders(req, res) {
  const { rows } = await query('SELECT id, provider_name, base_url, enabled, priority FROM providers ORDER BY priority');
  return res.json(rows);
}

export async function toggleProvider(req, res) {
  await query('UPDATE providers SET enabled = $1 WHERE provider_name = $2', [req.body.enabled, req.body.providerName]);
  return res.json({ success: true });
}

export async function getUsers(req, res) {
  try {
    const { search } = req.query;
    let sql = `
      SELECT u.id, u.email, u.role, u.is_active, u.created_at,
             COALESCE(w.balance, 0) AS balance,
             (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
    `;
    const params = [];
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` WHERE LOWER(u.email) LIKE $1`;
    }
    sql += ` ORDER BY u.created_at DESC LIMIT 500`;
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    logger.error('getUsers error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
}

export async function toggleUser(req, res) {
  await query('UPDATE users SET is_active = $1 WHERE id = $2', [req.body.isActive, req.body.userId]);
  return res.json({ success: true });
}

export async function blockIp(req, res) {
  await query(
    `INSERT INTO blocked_ips (ip_address, reason) VALUES ($1,$2) ON CONFLICT (ip_address) DO NOTHING`,
    [req.body.ip, req.body.reason || 'Admin block']
  );
  return res.json({ success: true });
}

export async function getAllOrders(req, res) {
  const { rows } = await query(`
    SELECT o.id, o.service, o.phone_number, o.otp, o.status,
           o.provider_price, o.user_price, o.profit, o.provider, o.created_at, u.email
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC LIMIT 500
  `);
  return res.json(rows);
}

export async function withdraw(req, res) {
  const { amount, method, destination } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!['crypto_usdt', 'crypto_btc'].includes(method)) {
    return res.status(400).json({ error: 'Method must be crypto_usdt or crypto_btc' });
  }
  const { rows } = await query(
    `INSERT INTO withdrawals (admin_id, amount, method, destination) VALUES ($1,$2,$3,$4) RETURNING id`,
    [req.user.id, amount, method, destination]
  );
  return res.json({ success: true, withdrawalId: rows[0].id });
}

export async function getWithdrawals(req, res) {
  const { rows } = await query(
    'SELECT id, amount, method, destination, status, created_at FROM withdrawals ORDER BY created_at DESC'
  );
  return res.json(rows);
}
