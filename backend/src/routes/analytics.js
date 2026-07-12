import { Router } from 'express';
import { query } from '../config/database.js';
import { getDashboardMetrics } from '../services/metrics.js';
import logger from '../utils/logger.js';

const router = Router();

// ── GET /api/admin/analytics/overview ──────────────────────────
// Total users, orders, revenue, deposits today (from Redis metrics + DB)
router.get('/overview', async (req, res) => {
  try {
    const metrics = await getDashboardMetrics();

    // Also fetch total registered users from DB
    const { rows: userRows } = await query(
      'SELECT COUNT(*)::int AS total_users FROM users'
    );

    res.json({
      success: true,
      data: {
        totalUsers: userRows[0].total_users,
        today: metrics.today,
        yesterday: metrics.yesterday,
        thisWeek: metrics.thisWeek,
        thisMonth: metrics.thisMonth,
      },
    });
  } catch (err) {
    logger.error('analytics/overview failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch overview' });
  }
});

// ── GET /api/admin/analytics/revenue ───────────────────────────
// Revenue data by day for the last 30 days
router.get('/revenue', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::int AS orders,
        COALESCE(SUM(price), 0)::numeric(12,2) AS revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('analytics/revenue failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch revenue data' });
  }
});

// ── GET /api/admin/analytics/providers ─────────────────────────
// Provider stats: orders, failures, avg latency
router.get('/providers', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        provider,
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_orders,
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000))::int AS avg_latency_ms
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY provider
      ORDER BY total_orders DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('analytics/providers failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch provider stats' });
  }
});

// ── GET /api/admin/analytics/top-services ──────────────────────
// Top 10 services by order count
router.get('/top-services', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        service_name,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(price), 0)::numeric(12,2) AS total_revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY service_name
      ORDER BY order_count DESC
      LIMIT 10
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('analytics/top-services failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch top services' });
  }
});

// ── GET /api/admin/analytics/top-countries ─────────────────────
// Top 10 countries by order count
router.get('/top-countries', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        country,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(price), 0)::numeric(12,2) AS total_revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY country
      ORDER BY order_count DESC
      LIMIT 10
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('analytics/top-countries failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch top countries' });
  }
});

export default router;
