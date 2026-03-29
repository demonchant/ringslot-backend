import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoIcon from '../components/LogoIcon';
import { useRouter } from 'next/router';
import api from '../utils/api';

const BLOCKED_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','yopmail.com','yopmail.fr','fakeinbox.com',
  'mailnull.com','spamgourmet.com','trashmail.com','trashmail.me',
  'dispostable.com','maildrop.cc','getnada.com','moakt.com',
  '10minutemail.com','10minutemail.net','10minutemail.org',
  '20minutemail.com','filzmail.com','emailondeck.com',
  'getairmail.com','incognitomail.com','tempr.email','discard.email',
]);

function isValidEmail(email) {
  if (!email) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length < 1 || local.length > 64) return false;
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  if (email.includes(' ')) return false;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? BLOCKED_DOMAINS.has(domain) : false;
}

function getEmailError(email) {
  if (!email) return '';
  if (!email.includes('@')) return 'Email must contain @';
  if (!isValidEmail(email)) return 'Please enter a valid email address';
  if (isDisposableEmail(email)) return 'Disposable email addresses are not allowed';
  return '';
}

export default function Register() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const token = localStorage.getItem('rs_token');
      if (token) router.replace('/dashboard');
    } catch {}
  }, []);

  function handleEmailChange(val) {
    setForm(f => ({ ...f, email: val }));
    if (val.includes('@')) setEmailError(getEmailError(val));
    else setEmailError('');
  }

  function handleEmailBlur() {
    setEmailError(getEmailError(form.email));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const emailErr = getEmailError(form.email);
    if (emailErr) { setEmailError(emailErr); return; }
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');

    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (res.status === 201 && res.data?.token) {
        localStorage.setItem('rs_token', res.data.token);
        localStorage.setItem('rs_user', JSON.stringify(res.data.user));
        router.replace('/dashboard');
      } else if (res.status === 409) {
        setError('This email is already registered.');
      } else if (res.status === 429) {
        setError('Too many attempts. Please wait and try again.');
      } else {
        setError(res.data?.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Cannot reach server. Please check your connection and try again.');
    }
    setLoading(false);
  }

  if (!mounted) return null;

  const emailOk = form.email && !emailError && isValidEmail(form.email);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <div style={{
        padding: '16px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(250,249,247,0.8)',
        backdropFilter: 'blur(12px)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <LogoIcon size={30} />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.04em', fontFamily: 'Sora, sans-serif' }}>RingSlot</span>
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text3)', textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to home
        </Link>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 10, fontFamily: 'Sora, sans-serif' }}>Create account</h1>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Free to start. No credit card required.</p>
          </div>

          <div className="card" style={{ padding: 32 }}>
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="field">
                <label className="label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    autoCapitalize="none"
                    autoComplete="email"
                    required
                    style={{
                      paddingRight: 36,
                      borderColor: emailError ? 'var(--danger)' : emailOk ? 'var(--success)' : undefined,
                    }}
                  />
                  {form.email && (
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 14, fontWeight: 700,
                      color: emailOk ? 'var(--success)' : emailError ? 'var(--danger)' : 'transparent',
                    }}>
                      {emailOk ? '✓' : emailError ? '✗' : ''}
                    </div>
                  )}
                </div>
                {emailError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>⚠ {emailError}</p>}
                {emailOk && <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 5 }}>✓ Valid email address</p>}
              </div>

              {/* Password */}
              <div className="field">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
                {form.password && form.password.length < 8 && (
                  <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 5 }}>
                    {8 - form.password.length} more characters needed
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="field" style={{ marginBottom: 28 }}>
                <label className="label">Confirm password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  autoComplete="new-password"
                  required
                  style={{
                    borderColor: form.confirm && form.confirm !== form.password
                      ? 'var(--danger)'
                      : form.confirm && form.confirm === form.password
                      ? 'var(--success)'
                      : undefined,
                  }}
                />
                {form.confirm && form.confirm !== form.password && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>Passwords do not match</p>
                )}
                {form.confirm && form.confirm === form.password && (
                  <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 5 }}>✓ Passwords match</p>
                )}
              </div>

              <button
                className="btn btn-primary btn-full btn-lg"
                type="submit"
                disabled={loading || !!emailError || !emailOk}
              >
                {loading ? 'Creating account…' : 'Create account →'}
              </button>
            </form>

            <p style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', marginTop: 18, lineHeight: 1.7 }}>
              By creating an account you agree to our terms of service. We do not accept disposable email addresses.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--text3)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
