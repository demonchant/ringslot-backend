import axios from 'axios';

function client() {
  return axios.create({
    baseURL: 'https://5sim.net/v1',
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
      Accept: 'application/json',
    },
  });
}

export const fiveSim = {
  name: 'fivesim',

  async getBalance() {
    const { data } = await client().get('/user/profile');
    return parseFloat(data.balance);
  },

  async getNumber(service, country = 'any') {
    const c = country === 'any' ? 'any' : country.toLowerCase();
    const { data } = await client().get(`/user/buy/activation/${c}/any/${service}`);
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
      const { data } = await client().get(`/guest/prices?product=${service}`);
      let min = Infinity;
      for (const country of Object.values(data)) {
        for (const svc of Object.values(country)) {
          if (svc.Cost && svc.Cost < min) min = svc.Cost;
        }
      }
      return min === Infinity ? null : parseFloat(min);
    } catch {
      return null;
    }
  },
};
