import { query } from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { providerHealth } from './providerHealth.js';

const REPORT_CACHE_TTL = 300; // 5 minutes

// ── Helper: date key for today ────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ── Get raw report data for a date range ──────────────────────
export async function getReportData(startDate, endDate) {
  const [
    orderSummary,
    revenueData,
    topServices,
    providerPerformance,
    failedOrders,
    userStats,
    depositData,
  ] = await Promise.all([
    // Order summary
    query(`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
        COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
        COUNT(*) FILTER (WHERE status = 'waiting')::int AS waiting
      FROM orders
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
    `, [startDate, endDate]),

    // Revenue & profit from platform_revenue
    query(`
      SELECT
        COALESCE(SUM(user_paid), 0)::numeric(12,4) AS total_revenue,
        COALESCE(SUM(profit), 0)::numeric(12,4) AS total_profit,
        COALESCE(SUM(provider_cost), 0)::numeric(12,4) AS total_provider_cost,
        COUNT(*)::int AS revenue_entries
      FROM platform_revenue
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
    `, [startDate, endDate]),

    // Top services
    query(`
      SELECT
        service_name,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(price), 0)::numeric(12,4) AS revenue,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM orders
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
      GROUP BY service_name
      ORDER BY order_count DESC
      LIMIT 20
    `, [startDate, endDate]),

    // Provider performance
    query(`
      SELECT
        provider,
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COALESCE(SUM(provider_price), 0)::numeric(12,4) AS total_cost,
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000))::int AS avg_latency_ms
      FROM orders
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
        AND provider IS NOT NULL
      GROUP BY provider
      ORDER BY total_orders DESC
    `, [startDate, endDate]),

    // Recent failures for investigation
    query(`
      SELECT
        id, service_name AS service, provider, status, created_at
      FROM orders
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
        AND status = 'failed'
      ORDER BY created_at DESC
      LIMIT 20
    `, [startDate, endDate]),

    // User stats
    query(`
      SELECT
        COUNT(*)::int AS new_users
      FROM users
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
    `, [startDate, endDate]),

    // Deposit data
    query(`
      SELECT
        COUNT(*)::int AS total_deposits,
        COALESCE(SUM(amount), 0)::numeric(12,4) AS total_deposited
      FROM transactions
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
        AND type = 'deposit' AND status = 'completed'
    `, [startDate, endDate]),
  ]);

  return {
    period: { startDate, endDate },
    orders: orderSummary.rows[0],
    revenue: {
      totalRevenue: parseFloat(revenueData.rows[0].total_revenue),
      totalProfit: parseFloat(revenueData.rows[0].total_profit),
      totalProviderCost: parseFloat(revenueData.rows[0].total_provider_cost),
      entries: revenueData.rows[0].revenue_entries,
    },
    topServices: topServices.rows,
    providerPerformance: providerPerformance.rows,
    recentFailures: failedOrders.rows,
    users: {
      newUsers: userStats.rows[0].new_users,
    },
    deposits: {
      totalDeposits: depositData.rows[0].total_deposits,
      totalDeposited: parseFloat(depositData.rows[0].total_deposited),
    },
  };
}

// ── Generate daily report ─────────────────────────────────────
export async function generateDailyReport() {
  const cacheKey = `intelligence:report:daily:${todayKey()}`;

  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    const today = todayKey();
    const reportData = await getReportData(today, today);

    // Add live provider health
    const healthStats = providerHealth.getAllStats();

    const report = {
      type: 'daily',
      date: today,
      generatedAt: new Date().toISOString(),
      ...reportData,
      providerHealth: healthStats,
      summary: buildSummary(reportData),
    };

    // Cache for 5 minutes
    try {
      await redis.setex(cacheKey, REPORT_CACHE_TTL, JSON.stringify(report));
    } catch {}

    return report;
  } catch (err) {
    logger.error('Failed to generate daily report', { error: err.message });
    throw err;
  }
}

// ── Generate weekly report ────────────────────────────────────
export async function generateWeeklyReport() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const startDate = weekAgo.toISOString().slice(0, 10);
  const endDate = todayKey();
  const cacheKey = `intelligence:report:weekly:${startDate}:${endDate}`;

  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    const reportData = await getReportData(startDate, endDate);

    // Get daily breakdown for trends
    const { rows: dailyBreakdown } = await query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::int AS orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COALESCE(SUM(price), 0)::numeric(12,4) AS revenue
      FROM orders
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    // Provider trends
    const { rows: providerTrends } = await query(`
      SELECT
        DATE(created_at) AS date,
        provider,
        COUNT(*)::int AS orders,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failures
      FROM orders
      WHERE created_at >= $1 AND created_at < $2::date + INTERVAL '1 day'
        AND provider IS NOT NULL
      GROUP BY DATE(created_at), provider
      ORDER BY date ASC, provider
    `, [startDate, endDate]);

    const healthStats = providerHealth.getAllStats();

    const report = {
      type: 'weekly',
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      ...reportData,
      dailyBreakdown,
      providerTrends,
      providerHealth: healthStats,
      trends: calculateTrends(dailyBreakdown),
      summary: buildSummary(reportData),
    };

    // Cache for 5 minutes
    try {
      await redis.setex(cacheKey, REPORT_CACHE_TTL, JSON.stringify(report));
    } catch {}

    return report;
  } catch (err) {
    logger.error('Failed to generate weekly report', { error: err.message });
    throw err;
  }
}

// ── Build human-readable summary ──────────────────────────────
function buildSummary(data) {
  const { orders, revenue, topServices } = data;
  const successRate = orders.total_orders > 0
    ? ((orders.completed / orders.total_orders) * 100).toFixed(1)
    : '0.0';

  const topService = topServices.length > 0 ? topServices[0].service_name : 'N/A';

  return {
    totalOrders: orders.total_orders,
    completedOrders: orders.completed,
    failedOrders: orders.failed,
    successRate: parseFloat(successRate),
    totalRevenue: revenue.totalRevenue,
    totalProfit: revenue.totalProfit,
    profitMargin: revenue.totalRevenue > 0
      ? parseFloat(((revenue.totalProfit / revenue.totalRevenue) * 100).toFixed(1))
      : 0,
    topService,
  };
}

// ── Calculate trends from daily data ──────────────────────────
function calculateTrends(dailyData) {
  if (dailyData.length < 2) {
    return { orderTrend: 'stable', revenueTrend: 'stable' };
  }

  // Compare first half to second half
  const mid = Math.floor(dailyData.length / 2);
  const firstHalf = dailyData.slice(0, mid);
  const secondHalf = dailyData.slice(mid);

  const avgFirst = firstHalf.reduce((sum, d) => sum + d.orders, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, d) => sum + d.orders, 0) / secondHalf.length;

  const revFirst = firstHalf.reduce((sum, d) => sum + parseFloat(d.revenue), 0) / firstHalf.length;
  const revSecond = secondHalf.reduce((sum, d) => sum + parseFloat(d.revenue), 0) / secondHalf.length;

  function trend(first, second) {
    if (first === 0 && second === 0) return 'stable';
    if (first === 0) return 'up';
    const change = (second - first) / first;
    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  return {
    orderTrend: trend(avgFirst, avgSecond),
    revenueTrend: trend(revFirst, revSecond),
    avgDailyOrders: parseFloat((dailyData.reduce((s, d) => s + d.orders, 0) / dailyData.length).toFixed(1)),
    avgDailyRevenue: parseFloat((dailyData.reduce((s, d) => s + parseFloat(d.revenue), 0) / dailyData.length).toFixed(4)),
  };
}

export default {
  generateDailyReport,
  generateWeeklyReport,
  getReportData,
};
