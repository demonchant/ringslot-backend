import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import AdminSupport from '../components/AdminSupport';

const TABS = ['Overview', 'Users', 'Orders', 'Providers', 'Markup', 'Withdraw', 'Support'];

export default function Admin() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'crypto_usdt', destination: '' });
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [markupForm, setMarkupForm] = useState({ service: '', markup: '' });
  const [markupMsg, setMarkupMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    try {
      const u = JSON.parse(localStorage.getItem('rs_user') || 'null');
      if (!u || u.role !== 'admin') return router.push('/dashboard');
    } catch { return router.push('/dashboard'); }

    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => {});
    api.get('/admin/orders').then(({ data }) => setOrders(data)).catch(() => {});
    api.get('/admin/providers').then(({ data }) => setProviders(data)).catch(() => {});
    api.get('/services').then(({ data }) => setServices(data)).catch(() => {});
  }, []);

  async function doWithdraw(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/admin/withdraw', withdrawForm);
      setWithdrawMsg(`✅ Recorded! ID: ${data.withdrawalId}`);
    } catch (err) {
      setWithdrawMsg(`❌ ${err.response?.data?.error || 'Failed'}`);
    }
  }

  async function doMarkup(e) {
    e.preventDefault();
    try {
      await api.post('/admin/markup', markupForm);
      setMarkupMsg('✅ Markup updated');
    } catch (err) {
      setMarkupMsg(`❌ ${err.response?.data?.error || 'Failed'}`);
    }
  }

  async function toggleUser(userId, isActive) {
    await api.post('/admin/users/toggle', { userId, isActive });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: isActive } : u));
  }

  async function toggleProvider(providerName, enabled) {
    await api.post('/admin/providers/toggle', { providerName, enabled });
    setProviders((prev) => prev.map((p) => p.provider_name === providerName ? { ...p, enabled } : p));
  }

  const S = (n) => <span style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent)' }}>{n}</span>;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.6rem', marginBottom: '1.5rem' }}>Admin Panel</h1>

        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === i ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700, fontFamily: 'Syne', fontSize: '.9rem',
              padding: '.65rem 1rem', marginBottom: -1,
              borderBottom: tab === i ? '2px solid var(--accent)' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 0 && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                ['Total Profit', `$${stats.totalProfit?.toFixed(2)}`],
                ['Total Revenue', `$${stats.totalRevenue?.toFixed(2)}`],
                ['Total Orders', stats.totalOrders],
                ['Total Users', stats.totalUsers],
              ].map(([label, val]) => (
                <div key={label} className="card">
                  <div style={{ color: 'var(--muted)', fontSize: '.75rem', fontWeight: 700, letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Orders by Status</div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {Object.entries(stats.ordersByStatus || {}).map(([s, c]) => (
                  <div key={s}><span className={`badge badge-${s}`}>{s}</span> <span style={{ fontWeight: 700 }}>{c}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 1 && (
          <div className="card fade-up">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Email</th><th>Balance</th><th>Role</th><th>Active</th><th>Joined</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td style={{ color: 'var(--accent)' }}>${parseFloat(u.balance || 0).toFixed(4)}</td>
                      <td><span className="badge" style={{ background: u.role === 'admin' ? 'rgba(0,229,255,.15)' : 'var(--surface2)', color: u.role === 'admin' ? 'var(--accent)' : 'var(--muted)' }}>{u.role}</span></td>
                      <td style={{ color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>{u.is_active ? 'Yes' : 'No'}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-outline'}`}
                          onClick={() => toggleUser(u.id, !u.is_active)}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === 2 && (
          <div className="card fade-up">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>User</th><th>Service</th><th>Number</th><th>OTP</th><th>Status</th><th>Revenue</th><th>Profit</th></tr></thead>
                <tbody>
                  {orders.slice(0, 100).map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{o.email}</td>
                      <td>{o.service}</td>
                      <td className="mono" style={{ fontSize: '.8rem' }}>{o.phone_number}</td>
                      <td className="mono" style={{ color: 'var(--success)' }}>{o.otp || '—'}</td>
                      <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                      <td>${parseFloat(o.user_price).toFixed(4)}</td>
                      <td style={{ color: 'var(--success)' }}>${parseFloat(o.profit || 0).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Providers */}
        {tab === 3 && (
          <div className="card fade-up">
            {providers.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.provider_name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{p.base_url}</div>
                </div>
                <button className={`btn btn-sm ${p.enabled ? 'btn-danger' : 'btn-outline'}`}
                  onClick={() => toggleProvider(p.provider_name, !p.enabled)}>
                  {p.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Markup */}
        {tab === 4 && (
          <div className="card fade-up" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Update Service Markup</h3>
            {markupMsg && <div className="alert" style={{ marginBottom: '1rem', background: markupMsg.startsWith('✅') ? 'rgba(0,200,150,.1)' : 'rgba(255,71,87,.1)', color: markupMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', border: 'none' }}>{markupMsg}</div>}
            <form onSubmit={doMarkup}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Service</label>
                <select className="input" value={markupForm.service} onChange={(e) => setMarkupForm({ ...markupForm, service: e.target.value })} required>
                  <option value="">Select service...</option>
                  {services.map((s) => <option key={s.service_key} value={s.service_key}>{s.display_name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Markup multiplier (e.g. 1.5 = 50% profit)</label>
                <input className="input" type="number" step="0.01" min="1" placeholder="e.g. 1.5"
                  value={markupForm.markup} onChange={(e) => setMarkupForm({ ...markupForm, markup: e.target.value })} required />
              </div>
              <button className="btn btn-primary" type="submit">Update Markup</button>
            </form>
          </div>
        )}

        {/* Withdraw */}
        {tab === 5 && (
          <div className="card fade-up" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '.5rem' }}>Withdraw Profit</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '1.25rem' }}>
              Records a withdrawal. Send crypto manually to the address provided.
            </p>
            {withdrawMsg && <div className="alert" style={{ marginBottom: '1rem', background: withdrawMsg.startsWith('✅') ? 'rgba(0,200,150,.1)' : 'rgba(255,71,87,.1)', color: withdrawMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', border: 'none' }}>{withdrawMsg}</div>}
            <form onSubmit={doWithdraw}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Amount (USD)</label>
                <input className="input" type="number" min="1" placeholder="Amount to withdraw"
                  value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Method</label>
                <select className="input" value={withdrawForm.method} onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })}>
                  <option value="crypto_usdt">USDT (TRC20 / ERC20)</option>
                  <option value="crypto_btc">Bitcoin (BTC)</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Your Wallet Address</label>
                <input className="input mono" placeholder="Your receiving wallet address"
                  value={withdrawForm.destination} onChange={(e) => setWithdrawForm({ ...withdrawForm, destination: e.target.value })} required />
              </div>
              <button className="btn btn-primary" type="submit">Record Withdrawal</button>
            </form>
          </div>
        )}

        {/* Support */}
        {tab === 6 && <AdminSupport />}

      </div>
    </div>
  );
}
