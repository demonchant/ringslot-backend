import { Router } from 'express';
import logger from '../utils/logger.js';
import { getProviderReport } from '../services/providerMonitor.js';
import { comparePrices, getPriceHistory } from '../services/priceMonitor.js';
import { getRecentAlerts, acknowledgeAlert } from '../services/alerting.js';
import { generateDailyReport, generateWeeklyReport } from '../services/reporting.js';

const router = Router();

// ── GET /api/admin/intelligence/providers ─────────────────────
// Full provider report: balance, latency, success rate, circuit state
router.get('/providers', async (req, res) => {
  try {
    const report = await getProviderReport();
    res.json({ success: true, data: report });
  } catch (err) {
    logger.error('intelligence/providers failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch provider report' });
  }
});

// ── GET /api/admin/intelligence/prices?service=telegram ───────
// Price comparison across providers for a given service
router.get('/prices', async (req, res) => {
  try {
    const { service } = req.query;
    if (!service) {
      return res.status(400).json({ success: false, message: 'service query parameter is required' });
    }

    const comparison = await comparePrices(service);
    res.json({ success: true, data: comparison });
  } catch (err) {
    logger.error('intelligence/prices failed', { error: err.message, service: req.query.service });
    res.status(500).json({ success: false, message: 'Failed to fetch price comparison' });
  }
});

// ── GET /api/admin/intelligence/prices/history?service=telegram&days=7
// Price history for a service over N days
router.get('/prices/history', async (req, res) => {
  try {
    const { service, days } = req.query;
    if (!service) {
      return res.status(400).json({ success: false, message: 'service query parameter is required' });
    }

    const history = await getPriceHistory(service, parseInt(days) || 7);
    res.json({ success: true, data: history });
  } catch (err) {
    logger.error('intelligence/prices/history failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch price history' });
  }
});

// ── GET /api/admin/intelligence/alerts ────────────────────────
// Recent alerts
router.get('/alerts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await getRecentAlerts(limit);
    res.json({ success: true, data: alerts });
  } catch (err) {
    logger.error('intelligence/alerts failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

// ── POST /api/admin/intelligence/alerts/:id/acknowledge ───────
// Acknowledge an alert
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const found = await acknowledgeAlert(id);

    if (!found) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (err) {
    logger.error('intelligence/alerts/acknowledge failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert' });
  }
});

// ── GET /api/admin/intelligence/reports/daily ─────────────────
// Today's daily report
router.get('/reports/daily', async (req, res) => {
  try {
    const report = await generateDailyReport();
    res.json({ success: true, data: report });
  } catch (err) {
    logger.error('intelligence/reports/daily failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to generate daily report' });
  }
});

// ── GET /api/admin/intelligence/reports/weekly ────────────────
// This week's report
router.get('/reports/weekly', async (req, res) => {
  try {
    const report = await generateWeeklyReport();
    res.json({ success: true, data: report });
  } catch (err) {
    logger.error('intelligence/reports/weekly failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to generate weekly report' });
  }
});

export default router;
