import axios from 'axios';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://ringslot-backend.onrender.com').replace(/\/$/, '') + '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Accept all responses — let each page decide what to do
  validateStatus: () => true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('rs_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => {
    // Auto-redirect to login on 401 (expired session)
    if (r.status === 401 && typeof window !== 'undefined') {
      // Only redirect if it's not an auth endpoint (login/register/forgot etc)
      const isAuthEndpoint = r.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return r;
  },
  (err) => {
    // Network error / timeout — server unreachable
    return Promise.reject(err);
  }
);

export default api;
