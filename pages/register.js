import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '../utils/api';

export default function Register() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
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
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      localStorage.setItem('rs_token', data.token);
      localStorage.setItem('rs_user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || '';
      if (msg.toLowerCase().includes('already')) {
        setError('This email is already registered. Sign in instead.');
      } else if (!err.response) {
        setError('Cannot reach the server. Please wait a moment and try again — the server may be starting up.');
      } else if (status === 500) {
        setError('Server error. Please try again in a few seconds.');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
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
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 8 }}>Create your account</h1>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Free to start. No credit card required.</p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>
                {error}
                {error.includes('already registered') && (
                  <span> <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in →</Link></span>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  autoCapitalize="none" autoComplete="email" required />
              </div>
              <div className="field">
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="At least 8 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password" required />
              </div>
              <div className="field" style={{ marginBottom: 24 }}>
                <label className="label">Confirm password</label>
                <input className="input" type="password" placeholder="Repeat your password"
                  value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                  autoComplete="new-password" required />
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
              By creating an account you agree to our terms of service.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text3)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
