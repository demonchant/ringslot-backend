import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import LogoIcon from '../components/LogoIcon';
import ServiceLogo from '../components/ServiceLogo';

const SERVICES = ['telegram','google','discord','whatsapp','instagram','tiktok','facebook','amazon','twitter','uber','microsoft','apple'];

function LiveCard() {
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(0);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % 4;
      setStep(i);
      if (i === 2) setTimeout(() => setOtp('847 291'), 700);
      if (i === 0) setOtp('');
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="float-card" style={{
      background: 'var(--surface)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderRadius: 24,
      padding: 28,
      width: '100%',
      maxWidth: 330,
      boxShadow: '0 40px 80px rgba(91,71,224,0.12), 0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6)',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Inner gradient */}
      <div style={{
        position: 'absolute', top: -60, right: -40,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(91,71,224,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 3, fontFamily: 'Space Mono' }}>Active Number</div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 15, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>+1 (424) 678-****</div>
        </div>
        <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {step > 0 && step < 3 && <>
            <div className="signal-ring" style={{ width: 36, height: 36 }} />
            <div className="signal-ring" style={{ width: 36, height: 36 }} />
          </>}
          <div style={{
            width: 10, height: 10, borderRadius: '50%', zIndex: 1,
            background: step === 2 ? 'var(--accent)' : 'var(--text4)',
            boxShadow: step === 2 ? '0 0 16px rgba(91,71,224,0.6)' : 'none',
            transition: 'all 0.35s',
          }} />
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        marginBottom: 18,
        padding: '10px 14px',
        background: 'var(--bg2)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: step < 2 ? 'var(--warning)' : 'var(--success)',
          boxShadow: step < 2 ? '0 0 8px rgba(245,166,35,0.5)' : '0 0 8px rgba(0,184,122,0.5)',
          transition: 'all 0.4s',
        }} />
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
          {step === 0 ? 'Waiting for SMS…' : step === 1 ? 'Signal detected…' : step === 2 ? 'OTP received!' : 'Ready'}
        </span>
      </div>

      {/* OTP display */}
      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {otp ? (
          <div className="otp-pop" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Space Mono' }}>Verification Code</div>
            <div style={{
              fontFamily: 'Space Mono', fontSize: 42, fontWeight: 700,
              color: 'var(--accent)', letterSpacing: 10,
              textShadow: '0 0 30px rgba(91,71,224,0.3)',
            }}>{otp}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 13, fontFamily: 'Space Mono', letterSpacing: 6 }}>
            {step === 0 ? '— — — — —' : '…'}
          </div>
        )}
      </div>

      {/* Bottom service row */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <ServiceLogo serviceKey="telegram" size={28} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Telegram</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Registration OTP</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--success)',
            background: 'rgba(0,184,122,0.1)', border: '1px solid rgba(0,184,122,0.2)',
            padding: '3px 10px', borderRadius: 20, fontFamily: 'Space Mono',
          }}>$0.12</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div style={{ paddingTop: 110, paddingBottom: 100, position: 'relative', overflow: 'hidden' }}>
        <div className="mesh-bg" />

        {/* Large decorative circle */}
        <div style={{
          position: 'absolute', top: -200, left: '55%',
          width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(91,71,224,0.05) 0%, transparent 60%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>

            {/* Text */}
            <div>
              {/* Pill badge */}
              <div className="pill" style={{ marginBottom: 32, display: 'inline-flex' }}>
                <span style={{
                  width: 7, height: 7, background: 'var(--success)',
                  borderRadius: '50%', boxShadow: '0 0 8px rgba(0,184,122,0.5)',
                  animation: 'pulse-ring 2.5s ease-out infinite',
                }} />
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.02em' }}>
                  Live · Numbers available now
                </span>
              </div>

              <h1 style={{
                fontSize: 'clamp(40px, 7vw, 76px)',
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: '-0.05em',
                marginBottom: 28,
                fontFamily: 'Sora, sans-serif',
                color: 'var(--text)',
              }}>
                Virtual numbers<br />for SMS{' '}
                <span className="shimmer-text">verification</span>
              </h1>

              <p style={{
                fontSize: 17, color: 'var(--text2)',
                maxWidth: 440, lineHeight: 1.75,
                fontWeight: 400, marginBottom: 40,
              }}>
                Get temporary phone numbers instantly. Receive OTP codes for any platform. Pay with crypto — no banks, no limits.
              </p>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link href="/register">
                  <button className="btn btn-primary btn-xl">Start for free →</button>
                </Link>
                <Link href="/pricing">
                  <button className="btn btn-ghost btn-xl">See pricing</button>
                </Link>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 40, marginTop: 44, flexWrap: 'wrap' }}>
                {[['50+', 'Services'], ['100+', 'Countries'], ['99%', 'Uptime']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Space Mono', color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LiveCard />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bento grid: everything built in ─────────────────── */}
      <div style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
        <div className="wrap">
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: 'inline-block',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--accent)',
              fontFamily: 'Space Mono',
              marginBottom: 14,
            }}>Platform</div>
            <h2 style={{
              fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900,
              letterSpacing: '-0.04em', marginBottom: 12,
              fontFamily: 'Sora, sans-serif',
            }}>Everything built in</h2>
            <p style={{ color: 'var(--text2)', fontSize: 15, maxWidth: 480 }}>No gimmicks. Just what works, every single time.</p>
          </div>

          {/* Bento grid — NO EMOJIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>

            {/* Instant delivery */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20, padding: 32,
              boxShadow: 'var(--shadow)',
              backdropFilter: 'blur(12px)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                background: 'linear-gradient(135deg, rgba(91,71,224,0.12) 0%, rgba(91,71,224,0.06) 100%)',
                border: '1px solid rgba(91,71,224,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L12.5 8H18L13.5 11.5L15.5 17.5L10 14L4.5 17.5L6.5 11.5L2 8H7.5L10 2Z" fill="var(--accent)" opacity="0.8"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, letterSpacing: '-0.02em', fontFamily: 'Sora' }}>Instant delivery</div>
              <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.65 }}>Numbers delivered in seconds with intelligent routing for maximum availability.</div>
            </div>

            {/* Crypto only — accent card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(91,71,224,0.07) 0%, rgba(124,74,247,0.05) 100%)',
              border: '1px solid rgba(91,71,224,0.18)',
              borderRadius: 20, padding: 32,
              boxShadow: '0 8px 32px rgba(91,71,224,0.08)',
              backdropFilter: 'blur(12px)',
              position: 'relative', overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(91,71,224,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(91,71,224,0.08)'; }}
            >
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 140, height: 140,
                background: 'radial-gradient(circle, rgba(91,71,224,0.10) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none',
              }} />
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                background: 'linear-gradient(135deg, rgba(91,71,224,0.2) 0%, rgba(91,71,224,0.10) 100%)',
                border: '1px solid rgba(91,71,224,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="6" width="14" height="10" rx="2" stroke="var(--accent)" strokeWidth="1.5"/>
                  <path d="M3 9h14" stroke="var(--accent)" strokeWidth="1.5"/>
                  <circle cx="6.5" cy="12.5" r="1" fill="var(--accent)"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, letterSpacing: '-0.02em', color: 'var(--accent)', fontFamily: 'Sora' }}>Crypto only</div>
              <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.65 }}>USDT, BTC, ETH and more. Zero chargebacks. Payments are final and instant.</div>
            </div>

            {/* Auto refund */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20, padding: 32,
              boxShadow: 'var(--shadow)',
              backdropFilter: 'blur(12px)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                background: 'rgba(0,184,122,0.1)',
                border: '1px solid rgba(0,184,122,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10C4 6.68629 6.68629 4 10 4C12.2091 4 14.1334 5.20693 15.1667 7M16 10C16 13.3137 13.3137 16 10 16C7.79086 16 5.86655 14.7931 4.83333 13" stroke="#00b87a" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M13 7H15.5V4.5" stroke="#00b87a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, letterSpacing: '-0.02em', fontFamily: 'Sora' }}>Auto refund</div>
              <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.65 }}>No OTP in 2 minutes? Wallet refunded automatically. No support ticket needed.</div>
            </div>

            {/* REST API */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20, padding: 32,
              boxShadow: 'var(--shadow)',
              backdropFilter: 'blur(12px)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                background: 'rgba(59,126,248,0.1)',
                border: '1px solid rgba(59,126,248,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 7L2 10L6 13" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 7L18 10L14 13" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 4L8 16" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, letterSpacing: '-0.02em', fontFamily: 'Sora' }}>REST API</div>
              <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.65 }}>Full API access with X-API-Key auth. Automate purchases and OTP polling programmatically.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────── */}
      <div style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'Space Mono', marginBottom: 14 }}>Process</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'Sora' }}>How it works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, maxWidth: 900, margin: '0 auto' }}>
            {[
              { n: '01', t: 'Create account', d: 'Sign up free — no credit card required.' },
              { n: '02', t: 'Deposit crypto', d: 'Fund your wallet instantly with crypto.' },
              { n: '03', t: 'Get a number', d: 'Pick a service and country, receive a number.' },
              { n: '04', t: 'Receive OTP', d: 'Your verification code appears automatically.' },
            ].map(({ n, t, d }) => (
              <div key={n} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700,
                  color: 'var(--accent)',
                }}>
                  {n}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: '-0.02em', fontFamily: 'Sora' }}>{t}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Services ──────────────────────────────────────────── */}
      <div style={{ padding: '56px 0', borderTop: '1px solid var(--border)' }}>
        <div className="wrap">
          <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24, textAlign: 'center', fontFamily: 'Space Mono' }}>
            Works with all major platforms
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {SERVICES.map(s => (
              <div key={s} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 16px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, fontSize: 13, color: 'var(--text2)', fontWeight: 600,
                boxShadow: 'var(--shadow-sm)',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <ServiceLogo serviceKey={s} size={20} />
                <span style={{ textTransform: 'capitalize' }}>{s === 'twitter' ? 'Twitter/X' : s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <div style={{ padding: '96px 0', borderTop: '1px solid var(--border)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="mesh-bg" />
        <div className="wrap">
          <div style={{
            maxWidth: 600, margin: '0 auto',
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 28, padding: '56px 48px',
            boxShadow: 'var(--shadow-xl)',
            backdropFilter: 'blur(20px)',
          }}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 16, fontFamily: 'Sora' }}>
              Start in 60 seconds
            </h2>
            <p style={{ color: 'var(--text2)', marginBottom: 36, fontSize: 16, lineHeight: 1.7 }}>
              Create an account, deposit crypto, and receive your first verification code.
            </p>
            <Link href="/register">
              <button className="btn btn-primary btn-xl">Create free account →</button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '28px 0' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoIcon size={26} />
            <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>© 2026 RingSlot</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['Pricing', '/pricing'], ['API', '/api-docs'], ['Support', '/support'], ['support@ringslot.shop', 'mailto:support@ringslot.shop']].map(([l, h]) => (
              <Link key={h} href={h} style={{ fontSize: 13, color: 'var(--text3)', transition: 'color 0.15s', fontWeight: 500 }}
                onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                onMouseLeave={e => e.target.style.color = 'var(--text3)'}>{l}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
