import Link from 'next/link';
import Navbar from '../components/Navbar';

const FEATURES = [
  { icon: '⚡', title: 'Instant delivery', desc: 'Numbers delivered in seconds with intelligent routing for maximum availability.' },
  { icon: '🔒', title: 'Crypto only', desc: 'Deposit with USDT, BTC, ETH and more. Payments are final — zero chargebacks, zero reversals.' },
  { icon: '🌍', title: 'Global coverage', desc: 'Numbers from 100+ countries for Telegram, Google, Discord, WhatsApp and 50+ more services.' },
  { icon: '↩️', title: 'Auto refunds', desc: 'No OTP in 2 minutes? You are refunded automatically. No tickets, no waiting.' },
  { icon: '🔌', title: 'REST API', desc: 'Full API access with your API key. Automate purchases, check status, cancel — all programmatically.' },
  { icon: '📊', title: 'Real-time dashboard', desc: 'Track orders live. OTPs appear the moment they arrive — no manual refresh needed.' },
];

const SERVICES = [
  { name: 'Telegram', img: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg' },
  { name: 'Google', img: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg' },
  { name: 'Discord', img: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.svg' },
  { name: 'WhatsApp', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  { name: 'Instagram', img: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png' },
  { name: 'TikTok', img: 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png' },
  { name: 'Facebook', img: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg' },
  { name: 'Amazon', img: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { name: 'Twitter/X', img: 'https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_%28white%29.png' },
  { name: 'Uber', img: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png' },
];

// Phone mockup SVG
function PhoneMockup() {
  return (
    <svg width="280" height="520" viewBox="0 0 280 520" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone body */}
      <rect x="10" y="10" width="260" height="500" rx="36" fill="#111111" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
      <rect x="20" y="20" width="240" height="480" rx="28" fill="#0a0a0a"/>
      {/* Notch */}
      <rect x="100" y="24" width="80" height="20" rx="10" fill="#111111"/>
      {/* Screen content */}
      {/* Status bar */}
      <text x="36" y="58" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace">9:41</text>
      <text x="210" y="58" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="monospace">●●●</text>
      {/* App header */}
      <rect x="36" y="72" width="120" height="16" rx="4" fill="rgba(0,229,153,0.2)"/>
      <rect x="36" y="72" width="60" height="16" rx="4" fill="rgba(0,229,153,0.4)"/>
      {/* Balance card */}
      <rect x="28" y="102" width="224" height="80" rx="12" fill="#161616" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <text x="44" y="124" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace" letterSpacing="1">BALANCE</text>
      <text x="44" y="148" fill="#00e599" fontSize="22" fontFamily="monospace" fontWeight="700">$24.8500</text>
      <rect x="180" y="118" width="56" height="24" rx="6" fill="#00e599"/>
      <text x="198" y="134" fill="#000" fontSize="10" fontWeight="700">+ Add</text>
      {/* Order card */}
      <rect x="28" y="198" width="224" height="110" rx="12" fill="#161616" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <text x="44" y="220" fill="rgba(255,255,255,0.8)" fontSize="11" fontWeight="600">Active Order</text>
      <rect x="44" y="230" width="50" height="14" rx="3" fill="rgba(245,166,35,0.2)"/>
      <text x="48" y="241" fill="#f5a623" fontSize="8" fontWeight="700">WAITING</text>
      <text x="44" y="268" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">NUMBER</text>
      <text x="44" y="284" fill="#00e599" fontSize="16" fontFamily="monospace" fontWeight="700">+1 (555) 234-8901</text>
      <rect x="44" y="296" width="80" height="6" rx="3" fill="rgba(0,229,153,0.2)"/>
      {/* OTP card */}
      <rect x="28" y="322" width="224" height="80" rx="12" fill="rgba(0,229,153,0.05)" stroke="rgba(0,229,153,0.2)" strokeWidth="1"/>
      <text x="44" y="344" fill="rgba(0,229,153,0.6)" fontSize="9" letterSpacing="1">OTP CODE</text>
      <text x="44" y="374" fill="#00e599" fontSize="28" fontFamily="monospace" fontWeight="700" letterSpacing="6">483921</text>
      {/* Bottom nav */}
      <rect x="28" y="420" width="224" height="56" rx="12" fill="#161616" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      {['⊞','↑','◎','✦'].map((icon, i) => (
        <text key={i} x={52 + i * 54} y="452" fill={i === 0 ? '#00e599' : 'rgba(255,255,255,0.3)'} fontSize="16" textAnchor="middle">{icon}</text>
      ))}
      {/* Side buttons */}
      <rect x="271" y="100" width="5" height="40" rx="2.5" fill="rgba(255,255,255,0.1)"/>
      <rect x="271" y="160" width="5" height="60" rx="2.5" fill="rgba(255,255,255,0.1)"/>
      <rect x="4" y="130" width="5" height="50" rx="2.5" fill="rgba(255,255,255,0.1)"/>
    </svg>
  );
}

// Globe illustration
function GlobeIllustration() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" stroke="rgba(0,229,153,0.15)" strokeWidth="1"/>
      <circle cx="100" cy="100" r="60" stroke="rgba(0,229,153,0.1)" strokeWidth="1"/>
      <circle cx="100" cy="100" r="40" stroke="rgba(0,229,153,0.08)" strokeWidth="1"/>
      {/* Latitude lines */}
      {[40,60,80,120,140,160].map(y => (
        <line key={y} x1="20" y1={y} x2="180" y2={y} stroke="rgba(0,229,153,0.06)" strokeWidth="1"/>
      ))}
      {/* Longitude lines */}
      {[40,60,80,100,120,140,160].map(x => (
        <line key={x} x1={x} y1="20" x2={x} y2="180" stroke="rgba(0,229,153,0.06)" strokeWidth="1"/>
      ))}
      {/* Dots for cities */}
      {[[100,60],[140,80],[60,90],[120,130],[80,140],[160,100],[40,110]].map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="4" fill="#00e599" opacity="0.8"/>
          <circle cx={cx} cy={cy} r="8" fill="#00e599" opacity="0.15"/>
        </g>
      ))}
      {/* Connection lines */}
      <line x1="100" y1="60" x2="140" y2="80" stroke="rgba(0,229,153,0.3)" strokeWidth="1" strokeDasharray="3 2"/>
      <line x1="140" y1="80" x2="120" y2="130" stroke="rgba(0,229,153,0.3)" strokeWidth="1" strokeDasharray="3 2"/>
      <line x1="60" y1="90" x2="100" y2="60" stroke="rgba(0,229,153,0.3)" strokeWidth="1" strokeDasharray="3 2"/>
      <line x1="80" y1="140" x2="120" y2="130" stroke="rgba(0,229,153,0.3)" strokeWidth="1" strokeDasharray="3 2"/>
      <circle cx="100" cy="100" r="80" stroke="rgba(0,229,153,0.2)" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export default function Home() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ paddingTop: 100, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse at center, rgba(0,229,153,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
        
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 60, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(0,229,153,0.08)', border: '1px solid rgba(0,229,153,0.2)', borderRadius: 20, marginBottom: 28 }}>
                <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Crypto-only · No chargebacks · Instant</span>
              </div>

              <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24 }}>
                Virtual phone numbers<br />
                <span style={{ color: 'var(--accent)' }}>for SMS verification</span>
              </h1>

              <p style={{ fontSize: 17, color: 'var(--text2)', maxWidth: 460, marginBottom: 36, lineHeight: 1.7, fontWeight: 300 }}>
                Buy temporary numbers instantly. Receive OTP codes for any platform. Pay with crypto — no banks, no limits.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/register">
                  <button className="btn btn-primary btn-xl">
                    Start for free
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </Link>
                <Link href="/pricing">
                  <button className="btn btn-secondary btn-xl">View pricing</button>
                </Link>
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
                {[['50+', 'Services supported'], ['100+', 'Countries covered'], ['99%', 'Delivery rate']].map(([val, label]) => (
                  <div key={label}>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Geist Mono, monospace', color: 'var(--text)', letterSpacing: '-0.03em' }}>{val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -40, background: 'radial-gradient(ellipse at center, rgba(0,229,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Services logos */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 0', background: 'var(--bg1)', overflow: 'hidden' }}>
        <div className="container">
          <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>Works with all major platforms</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SERVICES.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <img src={s.img} alt={s.name} style={{ width: 18, height: 18, objectFit: 'contain', filter: s.name === 'Twitter/X' || s.name === 'Amazon' ? 'invert(1)' : 'none', opacity: s.name === 'Twitter/X' || s.name === 'Amazon' ? 0.7 : 1 }} onError={e => e.target.style.display='none'} />
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '80px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>How it works</p>
              <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 36, lineHeight: 1.2 }}>Get a number in under 60 seconds</h2>
              {[
                { step: '01', title: 'Create account', desc: 'Sign up free. No credit card, no personal info required.' },
                { step: '02', title: 'Deposit crypto', desc: 'Send USDT, BTC, ETH or other crypto. Wallet credited instantly after confirmation.' },
                { step: '03', title: 'Buy a number', desc: 'Pick your service and country. We find the cheapest number from 3 providers.' },
                { step: '04', title: 'Receive OTP', desc: 'The code appears on your dashboard automatically within seconds.' },
              ].map((item) => (
                <div key={item.step} style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{item.step}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,229,153,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <GlobeIllustration />
              <div style={{ position: 'absolute', bottom: 20, right: 20, padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>
                <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4 }}>Latest OTP</div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 700, color: 'var(--success)', fontSize: 20, letterSpacing: 4 }}>847291</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div style={{ padding: '80px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>Built for reliability</h2>
            <p style={{ color: 'var(--text2)', fontSize: 15, fontWeight: 300 }}>No gimmicks. Just fast, reliable numbers.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: 'var(--bg)', padding: '28px 32px', transition: 'background 0.2s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
                <div style={{ fontSize: 24, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>Start in 60 seconds</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 32, fontWeight: 300, fontSize: 15 }}>No credit card. No KYC. Just crypto and a number.</p>
            <Link href="/register">
              <button className="btn btn-primary btn-xl">Create free account</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '24px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, background: 'var(--accent)', borderRadius: 4 }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>RingSlot</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>© 2026</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['Pricing', '/pricing'], ['API', '/api-docs'], ['Support', '/support']].map(([label, href]) => (
              <a key={href} href={href} style={{ fontSize: 13, color: 'var(--text3)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--text2)'}
                onMouseLeave={e => e.target.style.color = 'var(--text3)'}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
