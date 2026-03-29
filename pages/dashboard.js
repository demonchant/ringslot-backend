import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ServiceLogo from '../components/ServiceLogo';
import COUNTRIES from '../components/CountrySelect';
import api from '../utils/api';

const TABS = ['Buy number', 'Orders', 'API key'];

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState(0);
  const [balance, setBalance] = useState(0);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [service, setService] = useState('');
  const [country, setCountry] = useState('any');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const pollRef = useRef(null);
  const countryRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const u = JSON.parse(localStorage.getItem('rs_user') || 'null');
      if (!u) { router.push('/login'); return; }
      setUser(u);
    } catch { router.push('/login'); return; }
    fetchBalance(); fetchServices(); fetchOrders();

    // Close country dropdown on outside click
    const handleClick = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setShowCountryDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchBalance() {
    try { const { data } = await api.get('/wallet/balance'); setBalance(data.balance); } catch {}
  }
  async function fetchServices() {
    try {
      const { data } = await api.get('/services');
      setServices(data);
    } catch {}
    finally { setServicesLoading(false); }
  }
  async function fetchOrders() {
    try { const { data } = await api.get('/orders'); setOrders(data); } catch {}
  }

  async function handleBuy(e) {
    e.preventDefault();
    if (!service) return setBuyError('Please select a service');
    setBuyLoading(true); setBuyError('');
    try {
      const { data } = await api.post('/orders/buy', { service, country });
      setActiveOrder(data);
      setFocusMode(true);
      // Start 10 minute countdown
      setCountdown(600);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
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
          setFocusMode(false);
          fetchBalance(); fetchOrders();
        }
      } catch {}
    }, 5000);
  }

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(countdownRef.current); }, []);

  async function handleCancel(orderId) {
    try {
      await api.post('/orders/cancel', { id: orderId });
      setActiveOrder(null); setFocusMode(false);
      clearInterval(pollRef.current);
      clearInterval(countdownRef.current);
      setCountdown(0);
      fetchBalance(); fetchOrders();
    } catch (err) { alert(err.response?.data?.error || 'Cancel failed'); }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Filter services by search
  const filtered = services.filter(s =>
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    s.service_key.toLowerCase().includes(search.toLowerCase())
  );

  // Filter countries by search
  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];
  const selectedService = services.find(s => s.service_key === service);

  if (!mounted) return null;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Dashboard</h1>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>{user?.email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ padding: '10px 18px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono', fontWeight: 700, letterSpacing: '0.08em' }}>BALANCE</span>
              <span style={{ fontSize: 22, color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontWeight: 700, letterSpacing: '-0.03em' }}>${parseFloat(balance).toFixed(4)}</span>
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

        {/* BUY TAB */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

            {/* Buy form */}
            <div className="card fade-up" style={{ opacity: focusMode ? 0.4 : 1, transition: 'opacity 0.3s' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.02em' }}>Get a number</h2>
              {buyError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{buyError}</div>}

              <form onSubmit={handleBuy}>
                {/* Service search */}
                <div className="field">
                  <label className="label">Service</label>
                  <input className="input" placeholder="Search services..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ marginBottom: 8 }} />

                  {/* Selected service preview */}
                  {selectedService && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--adim)', border: '1px solid var(--aborder)', borderRadius: 8, marginBottom: 8 }}>
                      <div className="service-icon" style={{ width: 28, height: 28, borderRadius: 7, padding: 4 }}>
                        <ServiceLogo serviceKey={selectedService.service_key} size={20} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)', flex: 1 }}>{selectedService.display_name}</span>
                      <button type="button" onClick={() => setService('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  )}

                  {/* Service list */}
                  {!selectedService && (
                    <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg2)' }}>
                      {servicesLoading ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading services…</div>
                      ) : filtered.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                          {search ? 'No services match your search' : 'No services available'}
                        </div>
                      ) : filtered.map(s => (
                        <button key={s.service_key} type="button" onClick={() => { setService(s.service_key); setSearch(''); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', background: 'none', border: 'none',
                            borderBottom: '1px solid var(--border)', cursor: 'pointer',
                            textAlign: 'left', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <div className="service-icon" style={{ width: 28, height: 28, borderRadius: 7, padding: 4, flexShrink: 0 }}>
                            <ServiceLogo serviceKey={s.service_key} size={20} />
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, flex: 1 }}>{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Country selector */}
                <div className="field" style={{ marginBottom: 24, position: 'relative' }} ref={countryRef}>
                  <label className="label">Country</label>
                  <button type="button" onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setDropUp(spaceBelow < 320);
                      setShowCountryDrop(!showCountryDrop);
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px',
                      background: showCountryDrop ? 'var(--bg1)' : 'var(--bg2)',
                      border: `1px solid ${showCountryDrop ? 'var(--accent)' : 'var(--border)'}`,
                      boxShadow: showCountryDrop ? '0 0 0 3px var(--accentdim)' : 'none',
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 18 }}>{selectedCountry.flag}</span>
                    <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, flex: 1 }}>{selectedCountry.name}</span>
                    <span style={{
                      color: 'var(--text3)', fontSize: 10,
                      transform: showCountryDrop ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      display: 'inline-block',
                    }}>▼</span>
                  </button>

                  {showCountryDrop && (
                    <div style={{
                      position: 'fixed',
                      zIndex: 99999,
                      width: countryRef.current ? countryRef.current.getBoundingClientRect().width : 300,
                      left: countryRef.current ? countryRef.current.getBoundingClientRect().left : 0,
                      ...(dropUp
                        ? { bottom: window.innerHeight - (countryRef.current ? countryRef.current.getBoundingClientRect().top : 0) + 4 }
                        : { top: countryRef.current ? countryRef.current.getBoundingClientRect().bottom + 4 : 0 }
                      ),
                      background: 'var(--surface)',
                      border: '1px solid var(--border2)',
                      borderRadius: 12,
                      boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1)',
                      overflow: 'hidden',
                      backdropFilter: 'blur(16px)',
                    }}>
                      <div style={{ padding: 10 }}>
                        <input
                          className="input"
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          style={{ fontSize: 13 }}
                          autoFocus
                        />
                      </div>
                      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {filteredCountries.map(c => (
                          <button key={c.code} type="button"
                            onClick={() => { setCountry(c.code); setShowCountryDrop(false); setCountrySearch(''); }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 16px',
                              background: country === c.code ? 'var(--accentdim)' : 'transparent',
                              border: 'none',
                              borderBottom: '1px solid var(--border3, rgba(0,0,0,0.04))',
                              cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { if (country !== c.code) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                            onMouseLeave={e => { if (country !== c.code) e.currentTarget.style.background = 'transparent'; }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{c.flag}</span>
                            <span style={{
                              fontSize: 13,
                              color: country === c.code ? 'var(--accent)' : 'var(--text)',
                              fontWeight: country === c.code ? 700 : 400,
                            }}>{c.name}</span>
                            {country === c.code && (
                              <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn btn-primary btn-full" type="submit" disabled={buyLoading || !service}>
                  {buyLoading ? 'Securing your number...' : 'Get number'}
                </button>
              </form>
            </div>

            {/* Active order */}
            <div className="card fade-up" style={{ border: focusMode ? '1px solid var(--aborder)' : '1px solid var(--border)', boxShadow: focusMode ? '0 0 40px rgba(0,255,136,0.08)' : 'none', transition: 'all 0.3s' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.02em' }}>Active order</h2>

              {!activeOrder ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📱</div>
                  <p style={{ fontSize: 14 }}>No active order.<br />Select a service and get started.</p>
                </div>
              ) : (
                <div>
                  {/* Number */}
                  <div style={{ padding: '16px 20px', background: 'var(--bg2)', borderRadius: 10, marginBottom: 16, position: 'relative' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Phone number</div>
                    <div className="mono" style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.01em' }}>{activeOrder.number}</div>
                  </div>

                  {/* Countdown */}
                  {countdown > 0 && activeOrder?.status === 'waiting' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>Auto-refund in</span>
                      <span className="mono" style={{ fontSize: 13, color: countdown < 60 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                        {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}
                      </span>
                    </div>
                  )}

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {activeOrder.status === 'waiting' && <>
                        <div className="signal-ring" style={{ width: 16, height: 16 }} />
                        <div className="signal-ring" style={{ width: 16, height: 16 }} />
                      </>}
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeOrder.status === 'received' ? 'var(--success)' : activeOrder.status === 'waiting' ? 'var(--warning)' : 'var(--danger)', zIndex: 1 }} />
                    </div>
                    <span className={`badge badge-${activeOrder.status}`}>{activeOrder.status}</span>
                    {activeOrder.status === 'waiting' && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Checking every 5s...</span>}
                  </div>

                  {/* OTP */}
                  {activeOrder.otp && (
                    <div className="otp-pop" style={{ padding: '20px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, marginBottom: 16, textAlign: 'center', boxShadow: '0 0 30px rgba(0,255,136,0.08)' }}>
                      <div style={{ fontSize: 10, color: 'rgba(0,255,136,0.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>OTP Code — tap to copy</div>
                      <div className="mono" onClick={() => copy(activeOrder.otp)} style={{ fontSize: 'clamp(28px,6vw,44px)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', cursor: 'pointer', textShadow: '0 0 20px rgba(0,255,136,0.4)' }}>
                        {activeOrder.otp}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

        {/* ORDERS TAB */}
        {tab === 1 && (
          <div className="card fade-up" style={{ padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Order history</h2>
            </div>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)', fontSize: 14 }}>No orders yet</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Service</th><th>Number</th><th>OTP</th><th>Status</th><th>Price</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="primary">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="service-icon" style={{ width: 24, height: 24, borderRadius: 6, padding: 3, flexShrink: 0 }}>
                              <ServiceLogo serviceKey={o.service} size={18} />
                            </div>
                            <span style={{ fontSize: 13 }}>{o.service}</span>
                          </div>
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>{o.phone_number}</td>
                        <td className="mono" style={{ color: o.otp ? 'var(--success)' : 'var(--text3)', fontSize: 13, fontWeight: o.otp ? 700 : 400 }}>{o.otp || '—'}</td>
                        <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                        <td style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>${parseFloat(o.user_price).toFixed(4)}</td>
                        <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* API KEY TAB */}
        {tab === 2 && user && (
          <div className="card fade-up" style={{ maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>Your API key</h2>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>
              Add <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12, background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>X-API-Key: your_key</code> to authenticate requests.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input className="input mono" value={user.api_key || '—'} readOnly style={{ fontSize: 12 }} />
              <button className="btn btn-ghost" onClick={() => copy(user.api_key)} style={{ flexShrink: 0 }}>
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>
              Keep this secret. See <a href="/api-docs" style={{ color: 'var(--accent)' }}>API reference</a> for examples.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
