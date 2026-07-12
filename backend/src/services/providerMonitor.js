import { smsActivate } from '../providers/smsactivate.js';
import { fiveSim } from '../providers/fivesim.js';
import { smsMan } from '../providers/smsman.js';
import { query } from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { providerHealth } from './providerHealth.js';
import { createAlert, shouldAlert } from './alerting.js';

// ── Provider map ──────────────────────────────────────────────
const PROVIDERS = { smsactivate: smsActivate, fivesim: fiveSim, smsman: smsMan };

const MONITOR_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const LOW_BALANCE_THRESHOLD = 5; // dollars
const HIGH_FAILURE_RATE = 0.3; // 30%
const REPORT_CACHE_KEY = 'intelligence:provider_report';
const REPORT_CACHE_TTL = 120; // 2 minutes

let monitorInterval = null;

// ── Get enabled providers from DB ─────────────────────────────
async function getEnabledProviderNames() {
  const { rows } = await query(
    'SELECT provider_name FROM providers WHERE enabled = TRUE ORDER BY priority ASC'
  );
  return rows.map((r) => r.provider_name);
}

// ── Monitor all providers ─────────────────────────────────────
export async function monitorProviders() {
  logger.info('Provider monitor: running health check');

  const enabledNames = await getEnabledProviderNames();
  const allProviderNames = Object.keys(PROVIDERS);

  for (const name of allProviderNames) {
    const provider = PROVIDERS[name];
    if (!provider) continue;

    try {
      // Check balance
      const start = Date.now();
      const balance = await provider.getBalance();
      const responseMs = Date.now() - start;

      providerHealth.recordSuccess(name, responseMs);

      // Cache balance
      await redis.setex(`intelligence:balance:${name}`, 300, String(balance));

      // Alert on low balance
      if (balance < LOW_BALANCE_THRESHOLD) {
        if (await shouldAlert('low_balance', name)) {
          await createAlert('warning', 'low_balance', `Provider ${name} balance is low: $${balance.toFixed(2)}`, {
            provider: name,
            balance,
          });
        }
      }
    } catch (err) {
      providerHealth.recordFailure(name);
      logger.error(`Provider monitor: ${name} health check failed`, { error: err.message });

      if (await shouldAlert('provider_down', name)) {
        await createAlert('critical', 'provider_down', `Provider ${name} is not responding: ${err.message}`, {
          provider: name,
          error: err.message,
        });
      }
    }
  }

  // Run anomaly detection after collecting fresh data
  await detectAnomalies();
}

// ── Anomaly detection ─────────────────────────────────────────
export async function detectAnomalies() {
  const allStats = providerHealth.getAllStats();

  for (const [name, stats] of Object.entries(allStats)) {
    // High failure rate detection
    if (stats.totalRequests >= 10) {
      const failureRate = stats.totalFailures / stats.totalRequests;
      if (failureRate > HIGH_FAILURE_RATE) {
        if (await shouldAlert('high_failure_rate', name)) {
          await createAlert('warning', 'high_failure_rate',
            `Provider ${name} failure rate is ${(failureRate * 100).toFixed(1)}%`, {
              provider: name,
              failureRate: parseFloat((failureRate * 100).toFixed(1)),
              totalRequests: stats.totalRequests,
              totalFailures: stats.totalFailures,
            });

          // Auto-disable if failure rate > 50%
          if (failureRate > 0.5) {
            await autoDisableProvider(name, `Auto-disabled: ${(failureRate * 100).toFixed(1)}% failure rate`);
          }
        }
      }
    }

    // Circuit breaker open — provider is effectively down
    if (stats.state === 'OPEN') {
      if (await shouldAlert('provider_down', name)) {
        await createAlert('critical', 'provider_down',
          `Provider ${name} circuit breaker is OPEN (${stats.failures} consecutive failures)`, {
            provider: name,
            circuitState: stats.state,
            failures: stats.failures,
          });
      }
    }
  }
}

// ── Auto-disable provider ─────────────────────────────────────
export async function autoDisableProvider(name, reason) {
  try {
    await query('UPDATE providers SET enabled = FALSE WHERE provider_name = $1', [name]);

    // Cache the disable reason and timestamp
    await redis.setex(`intelligence:disabled:${name}`, 86400, JSON.stringify({
      reason,
      disabledAt: new Date().toISOString(),
    }));

    logger.warn(`Provider auto-disabled: ${name}`, { reason });

    await createAlert('critical', 'provider_down',
      `Provider ${name} has been auto-disabled: ${reason}`, {
        provider: name,
        reason,
        action: 'auto_disabled',
      });
  } catch (err) {
    logger.error(`Failed to auto-disable provider ${name}`, { error: err.message });
  }
}

// ── Auto-enable provider ──────────────────────────────────────
export async function autoEnableProvider(name) {
  try {
    await query('UPDATE providers SET enabled = TRUE WHERE provider_name = $1', [name]);
    await redis.del(`intelligence:disabled:${name}`);

    logger.info(`Provider auto-enabled: ${name}`);

    await createAlert('info', 'provider_down',
      `Provider ${name} has recovered and been re-enabled`, {
        provider: name,
        action: 'auto_enabled',
      });
  } catch (err) {
    logger.error(`Failed to auto-enable provider ${name}`, { error: err.message });
  }
}

// ── Comprehensive provider report ─────────────────────────────
export async function getProviderReport() {
  // Check cache first
  try {
    const cached = await redis.get(REPORT_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}

  const allStats = providerHealth.getAllStats();
  const allProviderNames = Object.keys(PROVIDERS);
  const report = {};

  // Get enabled state from DB
  const { rows: dbProviders } = await query(
    'SELECT provider_name, enabled, priority FROM providers ORDER BY priority ASC'
  );
  const dbMap = {};
  for (const row of dbProviders) {
    dbMap[row.provider_name] = row;
  }

  for (const name of allProviderNames) {
    const stats = allStats[name] || {
      state: 'CLOSED',
      score: 100,
      failures: 0,
      totalRequests: 0,
      totalFailures: 0,
      avgResponseMs: 0,
      isAvailable: true,
    };

    // Get cached balance
    let balance = null;
    try {
      const raw = await redis.get(`intelligence:balance:${name}`);
      if (raw) balance = parseFloat(raw);
    } catch {}

    // Get disable info if applicable
    let disableInfo = null;
    try {
      const raw = await redis.get(`intelligence:disabled:${name}`);
      if (raw) disableInfo = JSON.parse(raw);
    } catch {}

    const successRate = stats.totalRequests > 0
      ? parseFloat(((stats.totalRequests - stats.totalFailures) / stats.totalRequests * 100).toFixed(1))
      : 100;

    report[name] = {
      name,
      enabled: dbMap[name]?.enabled ?? false,
      priority: dbMap[name]?.priority ?? 99,
      balance,
      healthScore: stats.score,
      circuitState: stats.state,
      avgLatencyMs: stats.avgResponseMs,
      successRate,
      totalRequests: stats.totalRequests,
      totalFailures: stats.totalFailures,
      isAvailable: stats.isAvailable,
      disableInfo,
    };
  }

  // Cache the report
  try {
    await redis.setex(REPORT_CACHE_KEY, REPORT_CACHE_TTL, JSON.stringify(report));
  } catch {}

  return report;
}

// ── Start the monitor ─────────────────────────────────────────
export function startProviderMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }

  logger.info('Provider monitor started (2-minute interval)');

  monitorInterval = setInterval(async () => {
    try {
      await monitorProviders();
    } catch (err) {
      logger.error('Provider monitor cycle failed', { error: err.message });
    }
  }, MONITOR_INTERVAL_MS);

  // Run first check after short delay
  setTimeout(async () => {
    try {
      await monitorProviders();
    } catch (err) {
      logger.error('Provider monitor initial check failed', { error: err.message });
    }
  }, 15_000);

  return monitorInterval;
}

// ── Stop the monitor ──────────────────────────────────────────
export function stopProviderMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('Provider monitor stopped');
  }
}

export default {
  monitorProviders,
  detectAnomalies,
  autoDisableProvider,
  autoEnableProvider,
  getProviderReport,
  startProviderMonitor,
  stopProviderMonitor,
};
