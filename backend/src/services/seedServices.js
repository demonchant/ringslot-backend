// src/services/seedServices.js
// Seeds the services table on boot if it is empty.
// Safe to run multiple times — uses INSERT ... ON CONFLICT DO UPDATE.

import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const SERVICES = [
  // ── Messaging ─────────────────────────────────────────
  ['telegram',     'Telegram',           1.5],
  ['whatsapp',     'WhatsApp',           1.5],
  ['viber',        'Viber',              1.5],
  ['signal',       'Signal',             1.5],
  ['wechat',       'WeChat',             1.5],
  ['line',         'LINE',               1.5],
  ['discord',      'Discord',            1.5],
  ['slack',        'Slack',              1.5],
  ['skype',        'Skype',              1.5],
  ['zalo',         'Zalo',               1.5],
  ['imo',          'IMO',                1.5],
  ['kakao',        'KakaoTalk',          1.5],
  ['icq',          'ICQ',                1.5],
  // ── Social ────────────────────────────────────────────
  ['google',       'Google',             1.5],
  ['gmail',        'Gmail',              1.5],
  ['facebook',     'Facebook',           1.5],
  ['instagram',    'Instagram',          1.5],
  ['twitter',      'Twitter / X',        1.5],
  ['tiktok',       'TikTok',             1.5],
  ['snapchat',     'Snapchat',           1.5],
  ['linkedin',     'LinkedIn',           1.5],
  ['pinterest',    'Pinterest',          1.5],
  ['reddit',       'Reddit',             1.5],
  ['tumblr',       'Tumblr',             1.5],
  ['vk',           'VKontakte',          1.5],
  ['ok',           'Odnoklassniki',      1.5],
  ['twitch',       'Twitch',             1.5],
  ['youtube',      'YouTube',            1.5],
  ['clubhouse',    'Clubhouse',          1.5],
  // ── Email ─────────────────────────────────────────────
  ['yahoo',        'Yahoo Mail',         1.5],
  ['hotmail',      'Hotmail / Outlook',  1.5],
  ['outlook',      'Outlook',            1.5],
  ['protonmail',   'ProtonMail',         1.5],
  ['mailru',       'Mail.ru',            1.5],
  ['gmx',          'GMX Mail',           1.5],
  // ── E-commerce ────────────────────────────────────────
  ['amazon',       'Amazon',             1.5],
  ['ebay',         'eBay',               1.5],
  ['shopee',       'Shopee',             1.5],
  ['lazada',       'Lazada',             1.5],
  ['aliexpress',   'AliExpress',         1.5],
  ['etsy',         'Etsy',               1.5],
  ['wish',         'Wish',               1.5],
  ['ozon',         'Ozon',               1.5],
  ['wildberries',  'Wildberries',        1.5],
  ['avito',        'Avito',              1.5],
  ['olx',          'OLX',                1.5],
  ['poshmark',     'Poshmark',           1.5],
  ['flipkart',     'Flipkart',           1.5],
  ['mercadolibre', 'MercadoLibre',       1.5],
  // ── Finance ───────────────────────────────────────────
  ['paypal',       'PayPal',             1.5],
  ['cashapp',      'Cash App',           1.5],
  ['venmo',        'Venmo',              1.5],
  ['revolut',      'Revolut',            1.5],
  ['wise',         'Wise',               1.5],
  ['stripe',       'Stripe',             1.5],
  ['skrill',       'Skrill',             1.5],
  ['neteller',     'Neteller',           1.5],
  ['payoneer',     'Payoneer',           1.5],
  ['chime',        'Chime',              1.5],
  ['zelle',        'Zelle',              1.5],
  // ── Crypto ────────────────────────────────────────────
  ['binance',      'Binance',            1.5],
  ['coinbase',     'Coinbase',           1.5],
  ['bybit',        'Bybit',              1.5],
  ['okx',          'OKX',                1.5],
  ['kraken',       'Kraken',             1.5],
  ['kucoin',       'KuCoin',             1.5],
  ['gate',         'Gate.io',            1.5],
  ['huobi',        'Huobi',              1.5],
  ['mexc',         'MEXC',               1.5],
  ['bitget',       'Bitget',             1.5],
  ['gemini',       'Gemini',             1.5],
  ['trustwallet',  'Trust Wallet',       1.5],
  ['metamask',     'MetaMask',           1.5],
  ['crypto',       'Crypto.com',         1.5],
  // ── Ride / Delivery ───────────────────────────────────
  ['uber',         'Uber',               1.5],
  ['lyft',         'Lyft',               1.5],
  ['doordash',     'DoorDash',           1.5],
  ['grubhub',      'Grubhub',            1.5],
  ['ubereats',     'Uber Eats',          1.5],
  ['deliveroo',    'Deliveroo',          1.5],
  ['grab',         'Grab',               1.5],
  ['gojek',        'Gojek',              1.5],
  ['rappi',        'Rappi',              1.5],
  ['swiggy',       'Swiggy',             1.5],
  ['zomato',       'Zomato',             1.5],
  ['bolt',         'Bolt',               1.5],
  // ── Travel ────────────────────────────────────────────
  ['airbnb',       'Airbnb',             1.5],
  ['booking',      'Booking.com',        1.5],
  ['expedia',      'Expedia',            1.5],
  // ── Streaming & Gaming ────────────────────────────────
  ['netflix',      'Netflix',            1.5],
  ['spotify',      'Spotify',            1.5],
  ['steam',        'Steam',              1.5],
  ['epicgames',    'Epic Games',         1.5],
  ['hbo',          'HBO Max',            1.5],
  ['disney',       'Disney+',            1.5],
  ['apple',        'Apple ID',           1.5],
  ['microsoft',    'Microsoft',          1.5],
  ['hulu',         'Hulu',               1.5],
  ['roblox',       'Roblox',             1.5],
  // ── Dating ────────────────────────────────────────────
  ['tinder',       'Tinder',             1.5],
  ['bumble',       'Bumble',             1.5],
  ['badoo',        'Badoo',              1.5],
  ['hinge',        'Hinge',              1.5],
  ['okcupid',      'OkCupid',            1.5],
  ['grindr',       'Grindr',             1.5],
  // ── Gig & Jobs ────────────────────────────────────────
  ['upwork',       'Upwork',             1.5],
  ['fiverr',       'Fiverr',             1.5],
  ['freelancer',   'Freelancer',         1.5],
  ['indeed',       'Indeed',             1.5],
  ['glassdoor',    'Glassdoor',          1.5],
  // ── Productivity ─────────────────────────────────────
  ['notion',       'Notion',             1.5],
  ['zoom',         'Zoom',               1.5],
  ['dropbox',      'Dropbox',            1.5],
  // ── Other ─────────────────────────────────────────────
  ['naver',        'Naver',              1.5],
  ['truecaller',   'Truecaller',         1.5],
  ['github',       'GitHub',             1.5],
];

export async function seedServicesIfEmpty() {
  try {
    const { rows } = await query('SELECT COUNT(*) AS cnt FROM services');
    const count = parseInt(rows[0].cnt, 10);

    if (count > 0) {
      logger.info(`Services table already has ${count} rows — skipping seed`);
      return;
    }

    logger.info('Services table is empty — seeding now...');

    // Build a single multi-row INSERT for speed
    const values = SERVICES.map((_, i) => {
      const base = i * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3}, TRUE)`;
    }).join(',\n');

    const params = SERVICES.flatMap(([key, name, markup]) => [key, name, markup]);

    await query(
      `INSERT INTO services (service_key, display_name, markup, is_active)
       VALUES ${values}
       ON CONFLICT (service_key) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             markup       = EXCLUDED.markup,
             is_active    = EXCLUDED.is_active`,
      params
    );

    logger.info(`Seeded ${SERVICES.length} services successfully`);
  } catch (err) {
    logger.error('Service seed failed', { error: err.message });
  }
}
