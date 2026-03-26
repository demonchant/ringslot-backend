// src/providers/fivesim.js  — 5SIM.net API  (180+ countries, 1000+ services)
import axios from 'axios';

function client() {
  return axios.create({
    baseURL: 'https://5sim.net/v1',
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
      Accept: 'application/json',
    },
  });
}

const SERVICE_MAP = {
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
  bybit:'bybit', okx:'okx', kraken:'kraken', kucoin:'kucoin', gate:'gateio',
  huobi:'huobi', mexc:'mexc', bitget:'bitget', uber:'uber', lyft:'lyft',
  doordash:'doordash', airbnb:'airbnb', netflix:'netflix', spotify:'spotify',
  steam:'steam', epicgames:'epicgames', apple:'apple', microsoft:'microsoft',
  tinder:'tinder', bumble:'bumble', badoo:'badoo', hinge:'hinge',
  upwork:'upwork', fiverr:'fiverr', notion:'notion', zoom:'zoom',
  naver:'naver', truecaller:'truecaller', grab:'grab', gojek:'gojek',
  bolt:'bolt', booking:'booking', expedia:'expedia', hbo:'hbo', disney:'disney',
};

const COUNTRY_MAP = {
  any:'any', ru:'russia', ua:'ukraine', us:'usa', gb:'england', ca:'canada',
  au:'australia', de:'germany', fr:'france', it:'italy', es:'spain', pl:'poland',
  nl:'netherlands', se:'sweden', no:'norway', dk:'denmark', fi:'finland',
  be:'belgium', ch:'switzerland', at:'austria', cz:'czech', hu:'hungary',
  ro:'romania', gr:'greece', pt:'portugal', tr:'turkey', il:'israel',
  sa:'saudi-arabia', ae:'uae', ir:'iran', in:'india', cn:'china', jp:'japan',
  kr:'south-korea', id:'indonesia', my:'malaysia', th:'thailand', vn:'vietnam',
  ph:'philippines', sg:'singapore', hk:'hong-kong', tw:'taiwan', pk:'pakistan',
  bd:'bangladesh', kz:'kazakhstan', uz:'uzbekistan', az:'azerbaijan',
  ge:'georgia', am:'armenia', mm:'myanmar', kh:'cambodia', ng:'nigeria',
  eg:'egypt', za:'south-africa', ke:'kenya', gh:'ghana', tz:'tanzania',
  et:'ethiopia', ug:'uganda', cm:'cameroon', ma:'morocco', br:'brazil',
  mx:'mexico', ar:'argentina', cl:'chile', co:'colombia', pe:'peru',
  lt:'lithuania', lv:'latvia', ee:'estonia', mn:'mongolia', iq:'iraq',
  sy:'syria', jo:'jordan', lb:'lebanon', np:'nepal', lk:'sri-lanka',
  kp:'north-korea', la:'laos', tj:'tajikistan', kg:'kyrgyzstan', tm:'turkmenistan',
};

export const fiveSim = {
  name: 'fivesim',

  async getBalance() {
    const { data } = await client().get('/user/profile');
    return parseFloat(data.balance);
  },

  async getNumber(service, country = 'any') {
    const svc = SERVICE_MAP[service] || service;
    const ctr = COUNTRY_MAP[country] || 'any';
    const { data } = await client().get(`/user/buy/activation/${ctr}/any/${svc}`);
    if (data.id === undefined) throw new Error('5SIM: no number available');
    return { id: String(data.id), number: `+${data.phone}`, provider: this.name };
  },

  async getStatus(orderId) {
    const { data } = await client().get(`/user/check/${orderId}`);
    if (data.status === 'RECEIVED' && data.sms?.length) {
      return { status: 'received', sms: data.sms[0]?.text };
    }
    if (['CANCELED', 'TIMEOUT', 'BANNED'].includes(data.status)) {
      return { status: 'cancelled', sms: null };
    }
    return { status: 'waiting', sms: null };
  },

  async cancel(orderId) {
    await client().get(`/user/cancel/${orderId}`);
  },

  async getPrices(service) {
    try {
      const svc = SERVICE_MAP[service] || service;
      const { data } = await client().get(`/guest/prices?product=${svc}`);
      let min = Infinity;
      for (const country of Object.values(data)) {
        for (const s of Object.values(country)) {
          if (s.Cost && s.Cost < min) min = s.Cost;
        }
      }
      return min === Infinity ? null : parseFloat(min);
    } catch { return null; }
  },

  async getAllServices() {
    try {
      const { data } = await client().get('/guest/prices');
      const result = {};
      for (const [product, countries] of Object.entries(data)) {
        let min = Infinity;
        for (const country of Object.values(countries)) {
          for (const s of Object.values(country)) {
            if (s.Cost && s.Cost < min) min = s.Cost;
          }
        }
        if (min !== Infinity) result[product] = parseFloat(min);
      }
      return result;
    } catch { return {}; }
  },
};
