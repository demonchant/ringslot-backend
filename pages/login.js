import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoIcon from '../../components/LogoIcon';
import { useRouter } from 'next/router';
import api from '../utils/api';

export default function Login() {
  const router = useRouter();
  const [mounted, setMounted]             = useState(false);
  const [form, setForm]                   = useState({ email: '', password: '' });
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  // 'idle' | 'check_email' | 'first_login'
  const [state, setState]                 = useState('idle');
  const [sentTo, setSentTo]               = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    try {
      const token = localStorage.getItem('rs_token');
      if (token) router.replace('/dashboard');
    } catch {}

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get('reason');
      const verify = params.get('verify');

      if (reason === 'inactivity') setSessionExpired(true);

      if (verify === 'expired') {
        setVerifyMessage('Your verification link has expired. Please sign in again to receive a new one.');
      } else if (verify === 'invalid') {
        setVerifyMessage('This verification link is invalid or has already been used.');
      } else if (verify === 'already_used') {
        setVerifyMessage('This link was already used. Please sign in normally.');
      } else if (verify === 'error') {
        setVerifyMessage('Something went wrong with the verification. Please try again.');
      }
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', form);

      if (res.status === 202 && res.data?.requiresVerification) {
        // New device — backend sent a verification email
        setSentTo(form.email);
        setState(res.data.isFirstLogin ? 'first_login' : 'check_email');
      } else if (res.status === 200 && res.data?.token) {
        // Known device — log in immediately
        localStorage.setItem('rs_token', res.data.token);
        localStorage.setItem('rs_user', JSON.stringify(res.data.user));
        router.replace('/dashboard');
      } else if (res.status === 429) {
        setError('Too many login attempts. Please wait 15 minutes and try again.');
      } else {
        setError(res.data?.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Cannot reach server. Please check your connection and try again.');
    }
    setLoading(false);
  }

  if (!mounted) return null;

  // ── "Check your email" screen ─────────────────────────────
  if (state === 'check_email' || state === 'first_login') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>

            {/* Icon */}
            <div style={{
              width: 72, height: 72, margin: '0 auto 24px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(91,71,224,0.12), rgba(91,71,224,0.06))',
              border: '1px solid rgba(91,71,224,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 12, fontFamily: 'Sora, sans-serif' }}>
              {state === 'first_login' ? 'Confirm your sign-in' : 'New device detected'}
            </h1>

            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 28 }}>
              We sent a verification link to{' '}
              <strong style={{ color: 'var(--text)' }}>{sentTo}</strong>.
              {state === 'first_login'
                ? ' Click it to confirm your first sign-in and access your dashboard.'
                : ' Click it to confirm this sign-in from your new device.'}
            </p>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Check spam / junk folder', 'Sometimes verification emails land there.'],
                  ['Link expires in 15 minutes', 'Request a new one by signing in again.'],
                  ['Link is single-use', 'Each sign-in attempt generates a new link.'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0, boxShadow: '0 0 8px rgba(91,71,224,0.4)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-ghost btn-full" onClick={() => { setState('idle'); setError(''); }}>
              ← Use a different account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 10, fontFamily: 'Sora, sans-serif' }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Sign in to your RingSlot account</p>
          </div>

          <div className="card" style={{ padding: 32 }}>

            {/* Inactivity banner */}
            {sessionExpired && (
              <div style={{
                marginBottom: 20, padding: '12px 16px',
                background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#c07d00" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M9 7.5V10.5" stroke="#c07d00" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="9" cy="13" r="0.75" fill="#c07d00"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92640a', marginBottom: 2 }}>Session expired</div>
                  <div style={{ fontSize: 12, color: '#a07530', lineHeight: 1.5 }}>
                    You were signed out after 15 minutes of inactivity.
                  </div>
                </div>
              </div>
            )}

            {/* Verify message banner */}
            {verifyMessage && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>{verifyMessage}</div>
            )}

            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Email address</label>
                <input
                  className="input" type="email" placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value.trim() })}
                  autoCapitalize="none" autoComplete="email" required
                />
              </div>
              <div className="field" style={{ marginBottom: 28 }}>
                <label className="label">Password</label>
                <input
                  className="input" type="password" placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password" required
                />
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--text3)' }}>
            No account yet?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>Create one free →</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 14 }}>
            <Link href="/auth/forgot-password" style={{ color: 'var(--text3)', fontWeight: 500 }}>Forgot your password?</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 14, color: 'var(--text3)' }}>
            <Link href="/auth/forgot-password" style={{ color: 'var(--text3)', fontWeight: 500 }}>Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{
      padding: '16px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(250,249,247,0.8)', backdropFilter: 'blur(12px)',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
        <LogoIcon size={30} />
        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.04em', fontFamily: 'Sora, sans-serif' }}>RingSlot</span>
      </Link>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text3)', textDecoration: 'none', fontWeight: 500 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to home
      </Link>
    </div>
  );
}
