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

const PRICE_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const PRICE_CACHE_TTL = 600; // 10 minutes
const PRICE_HISTORY_TTL = 30 * 86400; // 30 days retention
const TOP_SERVICES_COUNT = 20;

let priceInterval = null;

// ── Get top services by order volume ──────────────────────────
async function getTopServices(limit = TOP_SERVICES_COUNT) {
  try {
    const { rows } = await query(`
      SELECT DISTINCT service_name
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY service_name
      ORDER BY COUNT(*) DESC
      LIMIT $1
    `, [limit]);
    return rows.map((r) => r.service_name).filter(Boolean);
  } catch (err) {
    logger.error('Failed to fetch top services', { error: err.message });
    return [];
  }
}

// ── Get enabled providers from DB ─────────────────────────────
async function getEnabledProviderNames() {
  const { rows } = await query(
    'SELECT provider_name FROM providers WHERE enabled = TRUE ORDER BY priority ASC'
  );
  return rows.map((r) => r.provider_name);
}

// ── Refresh prices for all top services ───────────────────────
export async function refreshPrices() {
  logger.info('Price monitor: refreshing prices');

  const services = await getTopServices();
  if (!services.length) {
    logger.info('Price monitor: no services to monitor');
    return;
  }

  const enabledNames = await getEnabledProviderNames();
  const now = new Date().toISOString();
  const dateKey = now.slice(0, 10); // YYYY-MM-DD

  for (const service of services) {
    const prices = {};

    for (const providerName of enabledNames) {
      const provider = PROVIDERS[providerName];
      if (!provider) continue;

      try {
        const start = Date.now();
        const price = await provider.getPrices(service);
        const responseMs = Date.now() - start;

        providerHealth.recordSuccess(providerName, responseMs);

        if (price !== null && price > 0) {
          prices[providerName] = price;

          // Cache individual price
          const priceKey = `intelligence:price:${providerName}:${service}`;
          await redis.setex(priceKey, PRICE_CACHE_TTL, String(price));

          // Add to price history time-series
          const historyKey = `intelligence:price_history:${service}:${providerName}`;
          const historyEntry = JSON.stringify({ price, timestamp: now });
          const pipeline = redis.pipeline();
          pipeline.lpush(historyKey, historyEntry);
          pipeline.ltrim(historyKey, 0, 2015); // ~2 weeks of 10-min intervals
          pipeline.expire(historyKey, PRICE_HISTORY_TTL);
          await pipeline.exec();

          // Check for price spikes
          const spiked = await detectPriceSpike(service, 0.5, providerName);
          if (spiked) {
            if (await shouldAlert('price_spike', `${providerName}:${service}`)) {
              await createAlert('warning', 'price_spike',
                `Price spike detected for ${service} on ${providerName}: $${price.toFixed(4)}`, {
                  provider: providerName,
                  service,
                  currentPrice: price,
                });
            }
          }
        }
      } catch (err) {
        providerHealth.recordFailure(providerName);
        logger.warn(`Price monitor: failed to get price from ${providerName} for ${service}`, {
          error: err.message,
        });
      }
    }

    // Cache combined prices for this service
    if (Object.keys(prices).length > 0) {
      await redis.setex(
        `intelligence:prices:${service}`,
        PRICE_CACHE_TTL,
        JSON.stringify(prices)
      );
    }
  }

  logger.info('Price monitor: refresh complete', { serviceCount: services.length });
}

// ── Compare prices across providers ───────────────────────────
export async function comparePrices(service) {
  // Try cache first
  try {
    const cached = await redis.get(`intelligence:prices:${service}`);
    if (cached) {
      const prices = JSON.parse(cached);
      return formatPriceComparison(service, prices);
    }
  } catch {}

  // Fetch live prices
  const enabledNames = await getEnabledProviderNames();
  const prices = {};

  for (const providerName of enabledNames) {
    const provider = PROVIDERS[providerName];
    if (!provider) continue;

    try {
      const price = await provider.getPrices(service);
      if (price !== null && price > 0) {
        prices[providerName] = price;
      }
    } catch {}
  }

  return formatPriceComparison(service, prices);
}

function formatPriceComparison(service, prices) {
  const entries = Object.entries(prices).map(([provider, price]) => ({
    provider,
    price,
  }));

  entries.sort((a, b) => a.price - b.price);

  const cheapest = entries.length > 0 ? entries[0].provider : null;

  return {
    service,
    providers: entries.map((e) => ({
      ...e,
      isCheapest: e.provider === cheapest,
    })),
    cheapestProvider: cheapest,
    cheapestPrice: entries.length > 0 ? entries[0].price : null,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Price history ─────────────────────────────────────────────
export async function getPriceHistory(service, days = 7) {
  const enabledNames = await getEnabledProviderNames();
  const cutoff = Date.now() - days * 86400 * 1000;
  const history = {};

  for (const providerName of enabledNames) {
    const historyKey = `intelligence:price_history:${service}:${providerName}`;
    try {
      const raw = await redis.lrange(historyKey, 0, -1);
      const entries = raw
        .map((item) => {
          try { return JSON.parse(item); } catch { return null; }
        })
        .filter(Boolean)
        .filter((e) => new Date(e.timestamp).getTime() >= cutoff)
        .reverse(); // oldest first

      if (entries.length > 0) {
        history[providerName] = entries;
      }
    } catch (err) {
      logger.warn(`Failed to get price history for ${service}:${providerName}`, { error: err.message });
    }
  }

  return {
    service,
    days,
    providers: history,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Detect price spike ────────────────────────────────────────
export async function detectPriceSpike(service, threshold = 0.5, providerName = null) {
  const providers = providerName ? [providerName] : await getEnabledProviderNames();

  for (const name of providers) {
    const historyKey = `intelligence:price_history:${service}:${name}`;
    try {
      // Get last 2 entries to compare
      const raw = await redis.lrange(historyKey, 0, 5);
      if (raw.length < 2) continue;

      const entries = raw.map((item) => {
        try { return JSON.parse(item); } catch { return null; }
      }).filter(Boolean);

      if (entries.length < 2) continue;

      const currentPrice = entries[0].price;
      // Use the average of the previous entries as baseline
      const previousPrices = entries.slice(1);
      const avgPrevious = previousPrices.reduce((sum, e) => sum + e.price, 0) / previousPrices.length;

      if (avgPrevious > 0) {
        const increase = (currentPrice - avgPrevious) / avgPrevious;
        if (increase > threshold) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

// ── Start price monitor ───────────────────────────────────────
export function startPriceMonitor() {
  if (priceInterval) {
    clearInterval(priceInterval);
  }

  logger.info('Price monitor started (10-minute interval)');

  priceInterval = setInterval(async () => {
    try {
      await refreshPrices();
    } catch (err) {
      logger.error('Price monitor cycle failed', { error: err.message });
    }
  }, PRICE_REFRESH_INTERVAL_MS);

  // First refresh after short delay
  setTimeout(async () => {
    try {
      await refreshPrices();
    } catch (err) {
      logger.error('Price monitor initial refresh failed', { error: err.message });
    }
  }, 30_000);

  return priceInterval;
}

// ── Stop price monitor ────────────────────────────────────────
export function stopPriceMonitor() {
  if (priceInterval) {
    clearInterval(priceInterval);
    priceInterval = null;
    logger.info('Price monitor stopped');
  }
}

export default {
  refreshPrices,
  comparePrices,
  getPriceHistory,
  detectPriceSpike,
  startPriceMonitor,
  stopPriceMonitor,
};
