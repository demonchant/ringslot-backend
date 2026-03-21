import axios from 'axios';

function client() {
  return axios.create({
    baseURL: 'https://api.sms-man.com/control',
    timeout: 15000,
    params: { token: process.env.SMSMAN_API_KEY },
  });
}

export const smsMan = {
  name: 'smsman',

  async getBalance() {
    const { data } = await client().get('/get-balance');
    return parseFloat(data.balance);
  },

  async getNumber(service, country = 'any') {
    const { data } = await client().get('/get-number', {
      params: { application_id: service, country_id: country === 'any' ? '1' : country },
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
      const { data } = await client().get('/get-prices', { params: { country_id: '1' } });
      return data[service] ? parseFloat(data[service].cost) : null;
    } catch {
      return null;
    }
  },
};
