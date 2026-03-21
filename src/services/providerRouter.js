import { smsActivate } from '../providers/smsactivate.js';
import { fiveSim } from '../providers/fivesim.js';
import { smsMan } from '../providers/smsman.js';
import { query } from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';

const PROVIDERS = { smsactivate: smsActivate, fivesim: fiveSim, smsman: smsMan };

async function enabledProviders() {
  const { rows } = await query(
    'SELECT provider_name FROM providers WHERE enabled = TRUE ORDER BY priority ASC'
  );
  return rows.map((r) => PROVIDERS[r.provider_name]).filter(Boolean);
}

async function getPrice(provider, service) {
  const key = `price:${provider.name}:${service}`;
  try {
    const cached = await redis.get(key);
    if (cached) return parseFloat(cached);
    const price = await provider.getPrices(service);
    if (price) await redis.setex(key, 300, String(price));
    return price;
  } catch {
    return null;
  }
}

export async function buyWithFailover(service, country = 'any') {
  const providers = await enabledProviders();
  const priced = (
    await Promise.all(providers.map(async (p) => ({ p, price: await getPrice(p, service) })))
  )
    .filter((x) => x.price > 0)
    .sort((a, b) => a.price - b.price);

  if (!priced.length) throw new Error('No providers available for this service');

  for (const { p, price } of priced) {
    try {
      const result = await p.getNumber(service, country);
      logger.info('Number bought', { provider: p.name, service, number: result.number });
      return { ...result, providerPrice: price };
    } catch (err) {
      logger.warn(`Provider ${p.name} failed`, { error: err.message });
    }
  }
  throw new Error('All providers failed. Try again shortly.');
}

export async function checkStatus(providerName, orderId) {
  const p = PROVIDERS[providerName];
  if (!p) throw new Error(`Unknown provider: ${providerName}`);
  return p.getStatus(orderId);
}

export async function cancelOrder(providerName, orderId) {
  const p = PROVIDERS[providerName];
  if (!p) throw new Error(`Unknown provider: ${providerName}`);
  await p.cancel(orderId);
}
