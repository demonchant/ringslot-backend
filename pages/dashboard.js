import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import ServiceLogo from '../components/ServiceLogo';

const TABS = ['Buy number', 'Orders', 'API key'];

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState(0);
  const [balance, setBalance] = useState(0);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [buyForm, setBuyForm] = useState({ service: '', country: 'any' });
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const u = JSON.parse(localStorage.getItem('rs_user') || 'null');
      if (!u) { router.push('/login'); return; }
      setUser(u);
    } catch { router.push('/login'); return; }
    fetchBalance();
    fetchServices();
    fetchOrders();
  }, []);

  async function fetchBalance() {
    try { const { data } = await api.get('/wallet/balance'); setBalance(data.balance); } catch {}
  }
  async function fetchServices() {
    try { const { data } = await api.get('/services'); setServices(data); } catch {}
  }
  async function fetchOrders() {
    try { const { data } = await api.get('/orders'); setOrders(data); } catch {}
  }

  async function handleBuy(e) {
    e.preventDefault();
    setBuyLoading(true); setBuyError('');
    try {
      const { data } = await api.post('/orders/buy', buyForm);
      setActiveOrder(data);
      fetchBalance(); fetchOrders();
      startPolling(data.orderId);
    } catch (err) {
      setBuyError(err.response?.data?.error || 'Purchase failed. Check your balance.');
    }
    setBuyLoading(false);
  }

  function startPolling(orderId) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/sms?id=${orderId}`);
        setActiveOrder(prev => ({ ...prev, ...data }));
        if (['received', 'cancelled', 'expired'].includes(data.status)) {
          clearInterval(pollRef.current);
          fetchBalance(); fetchOrders();
        }
      } catch {}
    }, 5000);
  }

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleCancel(orderId) {
    try {
      await api.post('/orders/cancel', { id: orderId });
      setActiveOrder(null);
      clearInterval(pollRef.current);
      fetchBalance(); fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancel failed');
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!mounted) return null;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Dashboard</h1>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>{user?.email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: '10px 16px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'Geist Mono, monospace', letterSpacing: '0.06em' }}>BALANCE</span>
              <span style={{ fontSize: 20, color: 'var(--accent)', fontFamily: 'Geist Mono, monospace', fontWeight: 700, letterSpacing: '-0.02em' }}>${parseFloat(balance).toFixed(4)}</span>
            </div>
            <button className="btn btn-primary" onClick={() => router.push('/deposit')}>+ Deposit</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* Buy number */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div className="card fade-up">
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>Get a number</h2>
              {buyError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{buyError}</div>}
              <form onSubmit={handleBuy}>
                <div className="field">
                  <label className="label">Service</label>
                  <select className="input" value={buyForm.service}
                    onChange={e => setBuyForm({ ...buyForm, service: e.target.value })} required>
                    <option value="">Select a service...</option>
                    {services.map(s => (
                      <option key={s.service_key} value={s.service_key}>{s.display_name}</option>
                    ))}
                  </select>
                  {buyForm.service && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <ServiceLogo serviceKey={buyForm.service} size={32} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{services.find(s => s.service_key === buyForm.service)?.display_name}</span>
                    </div>
                  )}
                </div>
                <div className="field" style={{ marginBottom: 24 }}>
                  <label className="label">Country <span style={{ color: 'var(--text3)' }}>(optional)</span></label>
                  <input className="input" placeholder="any (recommended) or enter a country code e.g. us, gb, ng"
                    value={buyForm.country} onChange={e => setBuyForm({ ...buyForm, country: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={buyLoading}>
                  {buyLoading ? 'Securing your number...' : 'Buy number'}
                </button>
              </form>
            </div>

            <div className="card fade-up">
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Active order</h2>
              {!activeOrder ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📱</div>
                  <p style={{ fontSize: 14 }}>No active order.<br />Get a number to get started.</p>
                </div>
              ) : (
                <div>
                  <div style={{ padding: '16px 20px', background: 'var(--bg2)', borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Phone number</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.01em' }}>{activeOrder.number}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>Status</span>
                    <span className={`badge badge-${activeOrder.status}`}>{activeOrder.status}</span>
                    {activeOrder.status === 'waiting' && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Checking every 5s</span>}
                  </div>
                  {activeOrder.otp && (
                    <div style={{ padding: '16px 20px', background: 'rgba(0,229,153,0.06)', border: '1px solid rgba(0,229,153,0.2)', borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>OTP Code</div>
                      <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)', letterSpacing: '0.1em' }}>{activeOrder.otp}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => copy(activeOrder.number)}>
                      {copied ? '✓ Copied' : 'Copy number'}
                    </button>
                    {activeOrder.status === 'waiting' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(activeOrder.orderId)}>
                        Cancel & refund
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === 1 && (
          <div className="card fade-up" style={{ padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Order history</h2>
            </div>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
                <p style={{ fontSize: 14 }}>No orders yet</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Service</th><th>Number</th><th>OTP</th><th>Status</th><th>Price</th><th>Date</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="primary">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ServiceLogo serviceKey={o.service} size={24} />
                            <span>{o.service}</span>
                          </div>
                        </td>
                        <td className="mono" style={{ fontSize: 13 }}>{o.phone_number}</td>
                        <td className="mono" style={{ color: o.otp ? 'var(--success)' : 'var(--text3)', fontSize: 13 }}>{o.otp || '—'}</td>
                        <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                        <td style={{ color: 'var(--accent)', fontFamily: 'Geist Mono, monospace', fontSize: 13 }}>${parseFloat(o.user_price).toFixed(4)}</td>
                        <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* API Key */}
        {tab === 2 && user && (
          <div className="card fade-up" style={{ maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Your API key</h2>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>
              Use this key in the <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>X-API-Key</code> header to authenticate requests.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input className="input input-mono" value={user.api_key || '—'} readOnly />
              <button className="btn btn-secondary" onClick={() => copy(user.api_key)} style={{ flexShrink: 0 }}>
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>
              Keep this secret. View the <a href="/api-docs" style={{ color: 'var(--accent)' }}>API reference</a> for usage examples.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
