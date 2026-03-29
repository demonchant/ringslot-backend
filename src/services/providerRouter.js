// src/services/providerRouter.js
import { smsActivate } from '../providers/smsactivate.js';
import { fiveSim }     from '../providers/fivesim.js';
import { smsMan }      from '../providers/smsman.js';
import { query }       from '../config/database.js';
import redis           from '../config/redis.js';
import logger          from '../utils/logger.js';

const PROVIDERS = {
  smsactivate: smsActivate,
  fivesim:     fiveSim,
  smsman:      smsMan,
};

// ── Service key maps ─────────────────────────────────────────
// Each provider uses its own codes for the same service.
// These maps translate our internal key → provider-specific key.

const HEROSMS_MAP = {
  telegram:'tg', whatsapp:'wa', viber:'vi', signal:'si', wechat:'wc',
  line:'li', discord:'ds', slack:'sl', skype:'sk', zalo:'za', imo:'im',
  icq:'ic', kakao:'kk', google:'go', gmail:'go', facebook:'fb',
  instagram:'ig', twitter:'tw', tiktok:'tkt', snapchat:'sc', linkedin:'li2',
  pinterest:'pi', reddit:'re', tumblr:'tu', quora:'qu', vk:'vk', ok:'ok',
  twitch:'tc', youtube:'yt', yahoo:'ya', hotmail:'ho', outlook:'ho',
  protonmail:'pm', mailru:'mr', amazon:'am', ebay:'eb', shopee:'sp',
  lazada:'lz', aliexpress:'ae', paypal:'pp', cashapp:'csh', venmo:'vm',
  revolut:'rl', wise:'ws', binance:'bn', coinbase:'co', bybit:'bb',
  okx:'okx', kraken:'kr', kucoin:'ku', uber:'ub', lyft:'lf',
  doordash:'dr', airbnb:'ab', netflix:'nf', spotify:'st', steam:'stm',
  apple:'ap', microsoft:'ms', tinder:'tn', bumble:'bm', badoo:'bd',
  hinge:'hi', upwork:'uw', fiverr:'fv', notion:'nt', zoom:'zm',
  naver:'nv', truecaller:'trc', grab:'gr', gojek:'gj',
  epicgames:'eg', hbo:'hbo', disney:'dp', hulu:'hu',
  stripe:'str', github:'gh', roblox:'ro',
};

const FIVESIM_MAP = {
  telegram:'telegram', whatsapp:'whatsapp', viber:'viber', signal:'signal',
  wechat:'wechat', line:'line', discord:'discord', slack:'slack', skype:'skype',
  zalo:'zalo', imo:'imo', kakao:'kakaotalk', google:'google', gmail:'google',
  facebook:'facebook', instagram:'instagram', twitter:'twitter', tiktok:'tiktok',
  snapchat:'snapchat', linkedin:'linkedin', pinterest:'pinterest', reddit:'reddit',
  tumblr:'tumblr', vk:'vk', ok:'odnoklassniki', twitch:'twitch', youtube:'youtube',
  yahoo:'yahoo', hotmail:'hotmail', outlook:'microsoft', protonmail:'protonmail',
  mailru:'mailru', amazon:'amazon', ebay:'ebay', shopee:'shopee',
  aliexpress:'aliexpress', paypal:'paypal', cashapp:'cashapp', venmo:'venmo',
  revolut:'revolut', wise:'wise', binance:'binance', coinbase:'coinbase',
  bybit:'bybit', okx:'okx', kraken:'kraken', kucoin:'kucoin',
  uber:'uber', lyft:'lyft', doordash:'doordash', airbnb:'airbnb',
  netflix:'netflix', spotify:'spotify', steam:'steam', epicgames:'epicgames',
  apple:'apple', microsoft:'microsoft', tinder:'tinder', bumble:'bumble',
  badoo:'badoo', hinge:'hinge', upwork:'upwork', fiverr:'fiverr',
  notion:'notion', zoom:'zoom', naver:'naver', truecaller:'truecaller',
  grab:'grab', gojek:'gojek', hbo:'hbo', disney:'disney', hulu:'hulu',
  stripe:'stripe', github:'github', roblox:'roblox',
};

const SMSMAN_MAP = {
  telegram:'26', whatsapp:'1', viber:'6', signal:'75', wechat:'25',
  line:'36', discord:'48', slack:'72', skype:'19', zalo:'44', imo:'17',
  kakao:'45', google:'2', gmail:'2', facebook:'3', instagram:'8',
  twitter:'4', tiktok:'64', snapchat:'16', linkedin:'13', pinterest:'40',
  reddit:'28', tumblr:'56', vk:'11', ok:'12', twitch:'33', youtube:'2',
  yahoo:'7', hotmail:'32', outlook:'32', protonmail:'81', mailru:'24',
  amazon:'14', ebay:'34', shopee:'68', lazada:'78', aliexpress:'62',
  paypal:'9', cashapp:'71', venmo:'80', revolut:'83', wise:'76',
  stripe:'77', binance:'57', coinbase:'58', bybit:'82', okx:'86',
  kraken:'61', kucoin:'59', uber:'29', lyft:'30', doordash:'35',
  grab:'66', gojek:'67', airbnb:'53', netflix:'43', spotify:'38',
  steam:'20', epicgames:'92', hbo:'93', disney:'94', apple:'37',
  microsoft:'32', hulu:'95', tinder:'39', bumble:'63', badoo:'15',
  hinge:'96', upwork:'98', fiverr:'99', naver:'49', truecaller:'51',
  zoom:'52', notion:'103', github:'104', roblox:'105',
};

function toProviderKey(serviceKey, providerName) {
  const key = (serviceKey || '').toLowerCase();
  if (providerName === 'smsactivate') return HEROSMS_MAP[key] || key;
  if (providerName === 'fivesim')     return FIVESIM_MAP[key] || key;
  if (providerName === 'smsman')      return SMSMAN_MAP[key]  || key;
  return key;
}

// ── Provider helpers ─────────────────────────────────────────
async function enabledProviders() {
  const { rows } = await query(
    'SELECT provider_name FROM providers WHERE enabled = TRUE ORDER BY priority ASC'
  );
  return rows.map((r) => PROVIDERS[r.provider_name]).filter(Boolean);
}

async function getPrice(provider, serviceKey) {
  const providerKey = toProviderKey(serviceKey, provider.name);
  const cacheKey = `price:${provider.name}:${providerKey}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseFloat(cached);
    const price = await provider.getPrices(providerKey);
    if (price) await redis.setex(cacheKey, 300, String(price));
    return price;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────
export async function buyWithFailover(serviceKey, country = 'any') {
  const providers = await enabledProviders();

  const priced = (
    await Promise.all(
      providers.map(async (p) => ({
        p,
        price: await getPrice(p, serviceKey),
        providerKey: toProviderKey(serviceKey, p.name),
      }))
    )
  )
    .filter((x) => x.price > 0)
    .sort((a, b) => a.price - b.price);

  if (!priced.length) throw new Error('No providers available for this service');

  for (const { p, providerKey } of priced) {
    try {
      const result = await p.getNumber(providerKey, country);
      logger.info('Number bought', { provider: p.name, service: serviceKey, number: result.number });
      return { ...result, providerPrice: await getPrice(p, serviceKey) };
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
