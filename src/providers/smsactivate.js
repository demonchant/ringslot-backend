import axios from 'axios';

const BASE = 'https://api.hero-sms.com/stubs/handler_api.php';

function get(params) {
  return axios.get(BASE, {
    params: { api_key: process.env.SMSACTIVATE_API_KEY, ...params },
    timeout: 15000,
  });
}

export const smsActivate = {
  name: 'smsactivate',

  async getBalance() {
    const { data } = await get({ action: 'getBalance' });
    return parseFloat(data.split(':')[1]);
  },

  async getNumber(service, country = 'any') {
    const { data } = await get({
      action: 'getNumber',
      service,
      country: country === 'any' ? '0' : country,
    });
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
      const { data } = await get({ action: 'getPrices', service });
      const parsed = JSON.parse(data);
      const costs = Object.values(parsed[service] || {}).map((v) => v.cost);
      return costs.length ? Math.min(...costs) : null;
    } catch {
      return null;
    }
  },
};
