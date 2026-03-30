import { query } from '../config/database.js';
import redis from '../config/redis.js';

const DEFAULT = 1.5;

export async function getMarkup(service) {
  const key = `markup:${service}`;
  try {
    const cached = await redis.get(key);
    if (cached) return parseFloat(cached);
  } catch {}
  const { rows } = await query(
    'SELECT markup FROM services WHERE service_key = $1 AND is_active = TRUE',
    [service]
  );
  const markup = rows[0] ? parseFloat(rows[0].markup) : DEFAULT;
  try { await redis.setex(key, 300, String(markup)); } catch {}
  return markup;
}

export async function applyMarkup(service, providerPrice) {
  const markup = await getMarkup(service);
  return {
    markup,
    userPrice: parseFloat((providerPrice * markup).toFixed(4)),
  };
}

export async function clearMarkupCache(service) {
  try { await redis.del(`markup:${service}`); } catch {}
}
