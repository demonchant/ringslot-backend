// src/providers/smsactivate.js  — HeroSMS / SMS-Activate API
import axios from 'axios';

const BASE = 'https://api.hero-sms.com/stubs/handler_api.php';

function get(params) {
  return axios.get(BASE, {
    params: { api_key: process.env.SMSACTIVATE_API_KEY, ...params },
    timeout: 20000,
  });
}

// Internal service key → HeroSMS code
const SERVICE_MAP = {
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
  naver:'nv', truecaller:'trc', grab:'gr', gojek:'gj', rappi:'rp',
  swiggy:'sw', zomato:'zm2', bolt:'blt', booking:'bkng', expedia:'ex',
  epicgames:'eg', hbo:'hbo', disney:'dp', hulu:'hu', okx:'okx',
  gate:'gt', huobi:'hb', mexc:'mx', bitget:'bg', crypto:'crp',
};

// Internal country code → HeroSMS numeric ID
const COUNTRY_MAP = {
  any:'0', ru:'0', ua:'1', kz:'2', am:'3', id:'6', vn:'10', au:'12',
  gb:'16', fi:'18', se:'19', az:'20', ge:'21', in:'22', cz:'24', it:'26',
  hu:'28', ro:'29', kr:'82', cn:'62', tr:'62', ca:'36', ar:'32', cl:'37',
  de:'43', lt:'44', lv:'45', th:'52', pe:'54', sg:'55', es:'56', ch:'57',
  sa:'58', dk:'59', ph:'63', fr:'78', nl:'88', pk:'92', tw:'95', ir:'143',
  us:'187', br:'73', mx:'52', ng:'109', eg:'86', ke:'115', gh:'120',
  za:'116', tz:'156', et:'161', ug:'153', cm:'108', ma:'85', jp:'35',
  my:'60', hk:'17', uz:'91', ee:'9', no:'47', be:'21', at:'38', pt:'76',
  gr:'30', il:'145', ae:'104', iq:'141', af:'130', mm:'66', pl:'15',
};

export const smsActivate = {
  name: 'smsactivate',

  async getBalance() {
    const { data } = await get({ action: 'getBalance' });
    return parseFloat(data.split(':')[1]);
  },

  async getNumber(service, country = 'any') {
    const svcCode = SERVICE_MAP[service] || service;
    const cntCode = COUNTRY_MAP[country] || '0';
    const { data } = await get({ action: 'getNumber', service: svcCode, country: cntCode });
    if (data.startsWith('NO_') || data.startsWith('ERROR')) throw new Error(data);
    const parts = data.split(':');
    return { id: parts[1], number: `+${parts[2]}`, provider: this.name };
  },

  async getStatus(orderId) {
    const { data } = await get({ action: 'getStatus', id: orderId });
    if (data.startsWith('STATUS_OK')) return { status: 'received', sms: data.split(':')[1] };
    if (data === 'STATUS_CANCEL') return { status: 'cancelled', sms: null };
    return { status: 'waiting', sms: null };
  },

  async cancel(orderId) {
    await get({ action: 'setStatus', id: orderId, status: 8 });
  },

  async getPrices(service) {
    try {
      const svcCode = SERVICE_MAP[service] || service;
      const { data } = await get({ action: 'getPrices', service: svcCode });
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const costs = Object.values(parsed[svcCode] || {})
        .map((v) => parseFloat(v.cost)).filter(Boolean);
      return costs.length ? Math.min(...costs) : null;
    } catch { return null; }
  },

  async getAllServices() {
    try {
      const { data } = await get({ action: 'getPrices' });
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const result = {};
      for (const [code, countries] of Object.entries(parsed)) {
        const costs = Object.values(countries).map((v) => parseFloat(v.cost)).filter(Boolean);
        if (costs.length) result[code] = Math.min(...costs);
      }
      return result;
    } catch { return {}; }
  },
};
