import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const SERVICES = [
  ['telegram','Telegram',1.5],['whatsapp','WhatsApp',1.5],['viber','Viber',1.5],
  ['signal','Signal',1.5],['wechat','WeChat',1.5],['line','LINE',1.5],
  ['discord','Discord',1.5],['slack','Slack',1.5],['skype','Skype',1.5],
  ['zalo','Zalo',1.5],['imo','IMO',1.5],['kakao','KakaoTalk',1.5],
  ['google','Google',1.5],['gmail','Gmail',1.5],['facebook','Facebook',1.5],
  ['instagram','Instagram',1.5],['twitter','Twitter / X',1.5],['tiktok','TikTok',1.5],
  ['snapchat','Snapchat',1.5],['linkedin','LinkedIn',1.5],['pinterest','Pinterest',1.5],
  ['reddit','Reddit',1.5],['tumblr','Tumblr',1.5],['vk','VKontakte',1.5],
  ['ok','Odnoklassniki',1.5],['twitch','Twitch',1.5],['youtube','YouTube',1.5],
  ['yahoo','Yahoo Mail',1.5],['hotmail','Hotmail / Outlook',1.5],['outlook','Outlook',1.5],
  ['protonmail','ProtonMail',1.5],['mailru','Mail.ru',1.5],
  ['amazon','Amazon',1.5],['ebay','eBay',1.5],['shopee','Shopee',1.5],
  ['lazada','Lazada',1.5],['aliexpress','AliExpress',1.5],['etsy','Etsy',1.5],
  ['paypal','PayPal',1.5],['cashapp','Cash App',1.5],['venmo','Venmo',1.5],
  ['revolut','Revolut',1.5],['wise','Wise',1.5],['stripe','Stripe',1.5],
  ['skrill','Skrill',1.5],['payoneer','Payoneer',1.5],['zelle','Zelle',1.5],
  ['binance','Binance',1.5],['coinbase','Coinbase',1.5],['bybit','Bybit',1.5],
  ['okx','OKX',1.5],['kraken','Kraken',1.5],['kucoin','KuCoin',1.5],
  ['gate','Gate.io',1.5],['mexc','MEXC',1.5],['bitget','Bitget',1.5],
  ['gemini','Gemini',1.5],['trustwallet','Trust Wallet',1.5],['metamask','MetaMask',1.5],
  ['uber','Uber',1.5],['lyft','Lyft',1.5],['doordash','DoorDash',1.5],
  ['grubhub','Grubhub',1.5],['ubereats','Uber Eats',1.5],['deliveroo','Deliveroo',1.5],
  ['grab','Grab',1.5],['gojek','Gojek',1.5],['swiggy','Swiggy',1.5],
  ['zomato','Zomato',1.5],['bolt','Bolt',1.5],
  ['airbnb','Airbnb',1.5],['booking','Booking.com',1.5],['expedia','Expedia',1.5],
  ['netflix','Netflix',1.5],['spotify','Spotify',1.5],['steam','Steam',1.5],
  ['epicgames','Epic Games',1.5],['hbo','HBO Max',1.5],['disney','Disney+',1.5],
  ['apple','Apple ID',1.5],['microsoft','Microsoft',1.5],['hulu','Hulu',1.5],
  ['roblox','Roblox',1.5],
  ['tinder','Tinder',1.5],['bumble','Bumble',1.5],['badoo','Badoo',1.5],
  ['hinge','Hinge',1.5],['okcupid','OkCupid',1.5],['grindr','Grindr',1.5],
  ['upwork','Upwork',1.5],['fiverr','Fiverr',1.5],['freelancer','Freelancer',1.5],
  ['indeed','Indeed',1.5],['glassdoor','Glassdoor',1.5],
  ['notion','Notion',1.5],['zoom','Zoom',1.5],['dropbox','Dropbox',1.5],
  ['naver','Naver',1.5],['truecaller','Truecaller',1.5],['github','GitHub',1.5],
];

export async function seedServicesIfEmpty() {
  try {
    const { rows } = await query('SELECT COUNT(*) AS cnt FROM services');
    if (parseInt(rows[0].cnt) > 0) {
      logger.info(`Services: ${rows[0].cnt} already seeded`);
      return;
    }
    logger.info('Seeding services…');
    const vals = SERVICES.map((_,i) => `($${i*3+1},$${i*3+2},$${i*3+3},TRUE)`).join(',');
    const params = SERVICES.flatMap(([k,n,m]) => [k,n,m]);
    await query(`INSERT INTO services (service_key,display_name,markup,is_active) VALUES ${vals}
      ON CONFLICT (service_key) DO UPDATE SET display_name=EXCLUDED.display_name,markup=EXCLUDED.markup`, params);
    logger.info(`Seeded ${SERVICES.length} services`);
  } catch (err) {
    logger.error('Seed failed', { error: err.message });
  }
}
