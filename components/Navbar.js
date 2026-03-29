import { useEffect, useState } from 'react';
import LogoIcon from './LogoIcon';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    router.push('/');
  }

  const isActive = (path) => router.pathname === path;

  const navLinks = user ? [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/deposit',   label: 'Deposit' },
    { href: '/pricing',   label: 'Pricing' },
    { href: '/support',   label: 'Support' },
    { href: '/api-docs',  label: 'API' },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ] : [
    { href: '/pricing',  label: 'Pricing' },
    { href: '/api-docs', label: 'API' },
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 72,
        background: scrolled
          ? 'rgba(250,249,247,0.88)'
          : 'rgba(240,237,232,0.60)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(0,0,0,0.08)' : 'transparent'}`,
        transition: 'all 0.2s',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.04)' : 'none',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 36, flexShrink: 0 }}>
                        <LogoIcon size={34} />
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'Sora, sans-serif' }}>RingSlot</span>
          </Link>

          {/* Desktop nav */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} style={{
                padding: '7px 14px', borderRadius: 9, fontSize: 14, fontWeight: 600,
                color: isActive(href) ? 'var(--accent)' : 'var(--text2)',
                background: isActive(href) ? 'var(--accentdim)' : 'transparent',
                transition: 'all 0.15s',
                fontFamily: 'Instrument Sans, sans-serif',
              }}
                onMouseEnter={e => { if (!isActive(href)) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}}
                onMouseLeave={e => { if (!isActive(href)) { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent'; }}}
              >{label}</Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {user ? (
              <>
                {balance !== null && (
                  <div style={{
                    padding: '7px 14px',
                    background: 'var(--accentdim)',
                    border: '1px solid var(--accentbrd)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'Space Mono', letterSpacing: '0.08em', fontWeight: 700 }}>BAL</span>
                    <span style={{ fontSize: 15, color: 'var(--accent)', fontFamily: 'Space Mono', fontWeight: 700 }}>${parseFloat(balance).toFixed(2)}</span>
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

          {/* Mobile hamburger */}
          <button className="hide-desktop" onClick={() => setMenuOpen(!menuOpen)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--text)', cursor: 'pointer', padding: 8,
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'var(--accent)' : 'var(--text)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'var(--accent)' : 'var(--text)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="hide-desktop" style={{
          position: 'fixed', top: 72, left: 0, right: 0, zIndex: 99,
          background: 'rgba(250,249,247,0.96)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 20px 28px',
          boxShadow: 'var(--shadow-lg)',
        }} onClick={() => setMenuOpen(false)}>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} style={{
              display: 'block', padding: '13px 0', fontSize: 16, fontWeight: 600,
              color: isActive(href) ? 'var(--accent)' : 'var(--text)',
              borderBottom: '1px solid var(--border)',
              fontFamily: 'Instrument Sans, sans-serif',
            }}>{label}</Link>
          ))}
          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            {user ? (
              <>
                {balance !== null && (
                  <div style={{ padding: '8px 14px', background: 'var(--accentdim)', border: '1px solid var(--accentbrd)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'Space Mono', fontWeight: 700 }}>BAL</span>
                    <span style={{ fontSize: 15, color: 'var(--accent)', fontFamily: 'Space Mono', fontWeight: 700 }}>${parseFloat(balance).toFixed(2)}</span>
                  </div>
                )}
                <button className="btn btn-ghost" onClick={logout} style={{ flex: 1 }}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" style={{ flex: 1 }}><button className="btn btn-ghost btn-full">Sign in</button></Link>
                <Link href="/register" style={{ flex: 1 }}><button className="btn btn-primary btn-full">Get started</button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
