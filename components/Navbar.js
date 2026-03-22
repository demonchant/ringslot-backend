import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('rs_user') || 'null');
      setUser(u);
      if (u) {
        import('../utils/api').then(({ default: api }) => {
          api.get('/wallet/balance').then(r => setBalance(r.data.balance)).catch(() => {});
        });
      }
    } catch {}
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  const isActive = (path) => router.pathname === path;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 64,
      background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      transition: 'background 0.2s',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', gap: 32 }}>
        
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="#000"/>
              <rect x="8" y="1" width="5" height="5" rx="1" fill="#000"/>
              <rect x="1" y="8" width="5" height="5" rx="1" fill="#000"/>
              <rect x="8" y="8" width="5" height="5" rx="1" fill="#000" opacity="0.4"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--text)' }}>RingSlot</span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/deposit',   label: 'Deposit' },
            { href: '/pricing',   label: 'Pricing' },
            { href: '/support',   label: 'Support' },
            { href: '/api-docs',  label: 'API' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 14,
              color: isActive(href) ? 'var(--text)' : 'var(--text3)',
              background: isActive(href) ? 'var(--bg2)' : 'transparent',
              fontWeight: isActive(href) ? 500 : 400,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isActive(href)) e.target.style.color = 'var(--text2)'; }}
            onMouseLeave={e => { if (!isActive(href)) e.target.style.color = 'var(--text3)'; }}>
              {label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link href="/admin" style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 14,
              color: isActive('/admin') ? 'var(--accent)' : 'var(--text3)',
              background: isActive('/admin') ? 'var(--accent-dim)' : 'transparent',
              transition: 'all 0.15s',
            }}>Admin</Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {user ? (
            <>
              {balance !== null && (
                <div style={{ padding: '6px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'Geist Mono, monospace' }}>BAL</span>
                  <span style={{ fontSize: 14, color: 'var(--accent)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>${parseFloat(balance).toFixed(2)}</span>
                </div>
              )}
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login"><button className="btn btn-ghost btn-sm">Sign in</button></Link>
              <Link href="/register"><button className="btn btn-primary btn-sm">Get started</button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
