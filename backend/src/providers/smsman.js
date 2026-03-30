// src/providers/smsman.js  — SMS-Man.com API  (200+ countries, 1500+ services)
// Docs: https://sms-man.com/en/api-documentation
import axios from 'axios';

function client() {
  return axios.create({
    baseURL: 'https://api.sms-man.com/control',
    timeout: 20000,
    params: { token: process.env.SMSMAN_API_KEY },
  });
}

// Internal service key → SMS-Man application_id
// SMS-Man uses numeric IDs for applications and countries
// Full list: GET /get-applications  and  GET /get-countries
const SERVICE_MAP = {
  telegram:    '26',   whatsapp:    '1',    viber:       '6',
  signal:      '75',   wechat:      '25',   line:        '36',
  discord:     '48',   slack:       '72',   skype:       '19',
  zalo:        '44',   imo:         '17',   kakao:       '45',
  google:      '2',    gmail:       '2',    facebook:    '3',
  instagram:   '8',    twitter:     '4',    tiktok:      '64',
  snapchat:    '16',   linkedin:    '13',   pinterest:   '40',
  reddit:      '28',   tumblr:      '56',   vk:          '11',
  ok:          '12',   twitch:      '33',   youtube:     '2',
  yahoo:       '7',    hotmail:     '32',   outlook:     '32',
  protonmail:  '81',   mailru:      '24',   gmx:         '55',
  amazon:      '14',   ebay:        '34',   shopee:      '68',
  lazada:      '78',   aliexpress:  '62',   jd:          '46',
  taobao:      '47',   etsy:        '41',   ozon:        '69',
  wildberries: '74',   avito:       '18',   poshmark:    '65',
  paypal:      '9',    cashapp:     '71',   venmo:       '80',
  revolut:     '83',   wise:        '76',   stripe:      '77',
  skrill:      '22',   neteller:    '23',   payoneer:    '42',
  binance:     '57',   coinbase:    '58',   bybit:       '82',
  okx:         '86',   kraken:      '61',   kucoin:      '59',
  gate:        '87',   huobi:       '60',   mexc:        '88',
  bitget:      '89',   gemini:      '90',   crypto:      '91',
  uber:        '29',   lyft:        '30',   doordash:    '35',
  grubhub:     '50',   grab:        '66',   gojek:       '67',
  rappi:       '79',   swiggy:      '70',   zomato:      '73',
  bolt:        '85',   airbnb:      '53',   booking:     '54',
  expedia:     '84',
  netflix:     '43',   spotify:     '38',   steam:       '20',
  epicgames:   '92',   hbo:         '93',   disney:      '94',
  apple:       '37',   microsoft:   '32',   hulu:        '95',
  tinder:      '39',   bumble:      '63',   badoo:       '15',
  hinge:       '96',   okcupid:     '97',
  upwork:      '98',   fiverr:      '99',   freelancer:  '100',
  indeed:      '101',  glassdoor:   '102',
  naver:       '49',   truecaller:  '51',
  zoom:        '52',   notion:      '103',  dropbox:     '104',
};

// Internal country code → SMS-Man country_id
const COUNTRY_MAP = {
  any:  '1',  // defaults to cheapest/Russia
  ru:   '1',  ua:   '2',  kz:   '3',  cn:   '4',  ph:   '5',
  mm:   '6',  id:   '7',  mz:   '8',  ng:   '10', gb:   '12',
  tz:   '14', ua:   '2',  ka:   '15', eg:   '16', in:   '22',
  vn:   '10', bd:   '11', pk:   '92', th:   '52', my:   '60',
  kr:   '82', jp:   '35', hk:   '17', sg:   '55', tw:   '95',
  us:   '187',ca:   '36', au:   '12', gb:   '12', de:   '43',
  fr:   '78', it:   '26', es:   '56', pl:   '15', nl:   '88',
  se:   '19', no:   '47', dk:   '59', fi:   '18', be:   '21',
  ch:   '57', at:   '38', cz:   '24', hu:   '28', ro:   '29',
  gr:   '30', pt:   '76', tr:   '62', il:   '145',sa:   '58',
  ae:   '104',ir:   '143',iq:   '141',af:   '130',br:   '73',
  mx:   '52', ar:   '32', cl:   '37', co:   '57', pe:   '54',
  za:   '116',ke:   '115',gh:   '120',et:   '161',ug:   '153',
  kh:   '53', la:   '67', mn:   '66', np:   '65', lk:   '84',
  kz:   '2',  uz:   '91', az:   '20', ge:   '21', am:   '3',
  lt:   '44', lv:   '45', ee:   '9',
};

export const smsMan = {
  name: 'smsman',

  async getBalance() {
    const { data } = await client().get('/get-balance');
    return parseFloat(data.balance);
  },

  async getNumber(service, country = 'any') {
    const appId = SERVICE_MAP[service] || service;
    const cntId = COUNTRY_MAP[country] || '1';
    const { data } = await client().get('/get-number', {
      params: { application_id: appId, country_id: cntId },
    });
    if (data.error_code) throw new Error(data.error_code);
    return { id: String(data.request_id), number: `+${data.number}`, provider: this.name };
  },

  async getStatus(orderId) {
    const { data } = await client().get('/get-sms', { params: { request_id: orderId } });
    if (data.error_code === 'wait_sms') return { status: 'waiting', sms: null };
    if (data.error_code) return { status: 'cancelled', sms: null };
    return { status: 'received', sms: data.sms_code };
  },

  async cancel(orderId) {
    await client().get('/set-status', { params: { request_id: orderId, status: 'reject' } });
  },

  async getPrices(service) {
    try {
      const appId = SERVICE_MAP[service] || service;
      const { data } = await client().get('/get-prices', { params: { country_id: '1' } });
      return data[appId] ? parseFloat(data[appId].cost) : null;
    } catch { return null; }
  },

  async getAllServices() {
    try {
      const { data } = await client().get('/get-prices', { params: { country_id: '1' } });
      const result = {};
      for (const [id, info] of Object.entries(data)) {
        if (info.cost) result[id] = parseFloat(info.cost);
      }
      return result;
    } catch { return {}; }
  },
};
