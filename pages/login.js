import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../utils/api';

export default function Login() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const token = localStorage.getItem('rs_token');
      if (token) router.replace('/dashboard');
    } catch {}
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('rs_token', data.token);
      localStorage.setItem('rs_user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    }
    setLoading(false);
  }

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="#000"/><rect x="8" y="1" width="5" height="5" rx="1" fill="#000"/><rect x="1" y="8" width="5" height="5" rx="1" fill="#000"/><rect x="8" y="8" width="5" height="5" rx="1" fill="#000" opacity="0.4"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>RingSlot</span>
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text3)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to home
        </Link>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 8 }}>Welcome back</h1>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Sign in to your RingSlot account</p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value.trim() })}
                  autoCapitalize="none" autoComplete="email" required />
              </div>
              <div className="field" style={{ marginBottom: 24 }}>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password" required />
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text3)' }}>
            No account yet?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
