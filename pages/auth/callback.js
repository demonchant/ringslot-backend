// pages/auth/callback.js
// Backend redirects here after user clicks the email verification link.
// URL: /auth/callback?jwt=TOKEN&verified=true

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LogoIcon from '../../components/LogoIcon';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const { jwt } = router.query;

    if (!jwt) {
      setStatus('error');
      setMessage('No authentication token found. Please try signing in again.');
      return;
    }

    async function finalise() {
      try {
        // Store the JWT first
        localStorage.setItem('rs_token', jwt);

        // Fetch user profile — pass JWT explicitly in the header
        // (don't rely on the axios interceptor which may not see the new token yet)
        const BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://ringslot-backend.onrender.com').replace(/\/$/, '');
        const res = await fetch(`${BASE}/api/me`, {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server returned ${res.status}`);
        }

        const data = await res.json();

        localStorage.setItem('rs_user', JSON.stringify({
          id:      data.id,
          email:   data.email,
          role:    data.role,
          api_key: data.api_key,
        }));

        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 1200);
      } catch (err) {
        localStorage.removeItem('rs_token');
        localStorage.removeItem('rs_user');
        setStatus('error');
        setMessage(err.message || 'Failed to complete sign-in. Your link may have expired — please try again.');
      }
    }

    finalise();
  }, [router.isReady, router.query]);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Logo at top */}
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoIcon size={36} />
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.04em', fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
          RingSlot
        </span>
      </div>

      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <div style={{
              width: 72, height: 72, margin: '0 auto 24px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(91,71,224,0.12), rgba(91,71,224,0.06))',
              border: '1px solid rgba(91,71,224,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                style={{ animation: 'spin 0.85s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(91,71,224,0.15)" strokeWidth="2.5"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 10, fontFamily: 'Sora, sans-serif' }}>
              Verifying your sign-in
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7 }}>
              Just a moment while we confirm your identity…
            </p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div style={{
              width: 72, height: 72, margin: '0 auto 24px', borderRadius: 20,
              background: 'rgba(0,184,122,0.1)', border: '1px solid rgba(0,184,122,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 10, fontFamily: 'Sora, sans-serif', color: 'var(--success)' }}>
              Device verified!
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7 }}>
              Redirecting you to your dashboard…
            </p>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={{
              width: 72, height: 72, margin: '0 auto 24px', borderRadius: 20,
              background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--danger)" strokeWidth="1.8"/>
                <path d="M12 8v5M12 16.5h.01" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 10, fontFamily: 'Sora, sans-serif' }}>
              Verification failed
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28 }}>
              {message}
            </p>
            <a href="/login" style={{
              display: 'block', padding: '14px 28px', borderRadius: 12,
              fontWeight: 700, fontSize: 15, color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(135deg, var(--accent), #7c4df7)',
            }}>
              Back to sign in →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
