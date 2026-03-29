import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoIcon from '../../components/LogoIcon';
import { useRouter } from 'next/router';
import api from '../../utils/api';

export default function ResetPassword() {
  const router = useRouter();
  const [token, setToken]         = useState('');
  const [form, setForm]           = useState({ password: '', confirm: '' });
  const [tokenValid, setTokenValid] = useState(null); // null=checking, true, false
  const [done, setDone]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const t = router.query.token;
    if (!t) { setTokenValid(false); return; }
    setToken(t);
    api.get(`/auth/validate-reset/${t}`)
      .then(({ data }) => setTokenValid(data.valid))
      .catch(() => setTokenValid(false));
  }, [router.isReady, router.query]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/reset-password', { token, password: form.password });
      if (res.status === 200 && res.data?.success) {
        setDone(true);
      } else {
        setError(res.data?.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Cannot reach server. Please check your connection and try again.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: tokenValid === false || done ? 'center' : 'left' }}>

          {/* Checking */}
          {tokenValid === null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: 14, background: 'var(--accentdim)', border: '1px solid var(--accentbrd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.9s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="rgba(91,71,224,0.2)" strokeWidth="2.5"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>Validating your reset link…</p>
            </div>
          )}

          {/* Invalid / expired token */}
          {tokenValid === false && (
            <>
              <div style={{ width: 64, height: 64, margin: '0 auto 24px', borderRadius: 18, background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--danger)" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, fontFamily: 'Sora, sans-serif' }}>Link expired or invalid</h1>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 28 }}>This password reset link is no longer valid. Links expire after 1 hour and can only be used once.</p>
              <Link href="/auth/forgot-password" className="btn btn-primary btn-full" style={{ display: 'block', textAlign: 'center', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, color: '#fff', background: 'linear-gradient(135deg, var(--accent), #7c4df7)', textDecoration: 'none' }}>Request a new link →</Link>
            </>
          )}

          {/* Success */}
          {done && (
            <>
              <div style={{ width: 64, height: 64, margin: '0 auto 24px', borderRadius: 18, background: 'rgba(0,184,122,0.1)', border: '1px solid rgba(0,184,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, fontFamily: 'Sora, sans-serif' }}>Password updated!</h1>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 28 }}>Your password has been changed successfully. You can now sign in with your new password.</p>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, color: '#fff', background: 'linear-gradient(135deg, var(--accent), #7c4df7)', textDecoration: 'none' }}>Sign in →</Link>
            </>
          )}

          {/* Reset form */}
          {tokenValid === true && !done && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 10, fontFamily: 'Sora, sans-serif' }}>Set new password</h1>
                <p style={{ color: 'var(--text3)', fontSize: 14 }}>Choose a strong password for your account.</p>
              </div>
              <div className="card" style={{ padding: 32 }}>
                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label className="label">New password</label>
                    <input className="input" type="password" placeholder="At least 8 characters"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      autoComplete="new-password" required autoFocus />
                    {form.password && form.password.length < 8 && (
                      <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 5 }}>{8 - form.password.length} more characters needed</p>
                    )}
                  </div>
                  <div className="field" style={{ marginBottom: 28 }}>
                    <label className="label">Confirm new password</label>
                    <input className="input" type="password" placeholder="Repeat your password"
                      value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                      autoComplete="new-password" required
                      style={{ borderColor: form.confirm && form.confirm !== form.password ? 'var(--danger)' : form.confirm && form.confirm === form.password ? 'var(--success)' : undefined }} />
                    {form.confirm && form.confirm !== form.password && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>Passwords do not match</p>}
                    {form.confirm && form.confirm === form.password && <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 5 }}>✓ Passwords match</p>}
                  </div>
                  <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading || form.password.length < 8 || form.password !== form.confirm}>
                    {loading ? 'Updating…' : 'Update password →'}
                  </button>
                </form>
              </div>
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
