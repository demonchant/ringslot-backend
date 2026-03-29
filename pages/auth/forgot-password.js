import { useState } from 'react';
import Link from 'next/link';
import LogoIcon from '../../components/LogoIcon';
import api from '../../utils/api';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      if (res.status === 200 || res.status === 201) {
        setSent(true);
      } else if (res.status === 429) {
        setError('Too many attempts. Please wait 15 minutes and try again.');
      } else {
        // Show the actual error detail so we can debug
        const detail = res.data?.detail || res.data?.error || `Server returned ${res.status}`;
        setError(detail);
        console.error('Forgot password error:', res.status, res.data);
      }
    } catch (err) {
      setError('Cannot reach server. Please check your connection and try again.');
      console.error('Forgot password network error:', err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 24px',
                borderRadius: 18, background: 'rgba(0,184,122,0.1)',
                border: '1px solid rgba(0,184,122,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, fontFamily: 'Sora, sans-serif' }}>Check your email</h1>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 28 }}>
                If <strong style={{ color: 'var(--text)' }}>{email}</strong> is registered with RingSlot, you'll receive a password reset link within a few minutes.
              </p>
              <div className="card" style={{ padding: 20, marginBottom: 20, textAlign: 'left' }}>
                {[
                  ['Check spam/junk folder', 'Reset emails sometimes land there.'],
                  ['Link expires in 1 hour', 'Request a new one if it expires.'],
                ].map(([t, d]) => (
                  <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{t}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/login" className="btn btn-ghost btn-full">← Back to sign in</Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 10, fontFamily: 'Sora, sans-serif' }}>Forgot password?</h1>
                <p style={{ color: 'var(--text3)', fontSize: 14 }}>Enter your email and we'll send you a reset link.</p>
              </div>
              <div className="card" style={{ padding: 32 }}>
                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                  <div className="field" style={{ marginBottom: 24 }}>
                    <label className="label">Email address</label>
                    <input className="input" type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset link →'}
                  </button>
                </form>
              </div>
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text3)' }}>
                Remembered it? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in →</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(250,249,247,0.8)', backdropFilter: 'blur(12px)' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
        <LogoIcon size={30} />
        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.04em', fontFamily: 'Sora, sans-serif' }}>RingSlot</span>
      </Link>
      <Link href="/login" style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to sign in
      </Link>
    </div>
  );
}
