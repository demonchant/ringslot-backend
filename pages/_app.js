import '../styles/globals.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { startActivityTimer, clearActivityTimer } from '../utils/activityTimer';

// Floating phone numbers canvas
function FloatingNumbers() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    // Phone number patterns
    const numberPatterns = [
      '+1 (424) 678-9021', '+44 7700 900142', '+234 803 456 7890',
      '+91 98765 43210', '+55 11 9876-5432', '+49 151 23456789',
      '+7 916 123-45-67', '+33 6 12 34 56 78', '+81 90-1234-5678',
      '+61 412 345 678', '+82 10-1234-5678', '+52 55 1234 5678',
      '847 291', '392 841', '519 027', '736 182', '064 937',
      '+1 (310) 555-0192', '+44 20 7946 0958', '+1 (646) 555-0134',
      '+254 700 123456', '+27 82 456 7890', '+20 100 123 4567',
    ];

    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    }

    function initParticles() {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 28000);
      for (let i = 0; i < count; i++) {
        particles.push(makeParticle(true));
      }
    }

    function makeParticle(random = false) {
      const text = numberPatterns[Math.floor(Math.random() * numberPatterns.length)];
      const fontSize = 10 + Math.random() * 6;
      const speed = 0.18 + Math.random() * 0.28;
      const drift = (Math.random() - 0.5) * 0.12;
      const opacity = 0.04 + Math.random() * 0.09;
      return {
        text,
        x: Math.random() * (canvas.width + 200) - 100,
        y: random ? Math.random() * canvas.height : canvas.height + 20,
        vy: -speed,
        vx: drift,
        fontSize,
        opacity,
        maxOpacity: opacity,
        angle: (Math.random() - 0.5) * 0.08,
        life: 1,
        lifeDecay: 0.00008 + Math.random() * 0.00006,
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.lifeDecay;

        // Fade in at start, fade out near end
        let alpha = p.opacity;
        if (p.life < 0.15) alpha *= p.life / 0.15;
        if (p.life > 0.9) alpha *= (1 - p.life) / 0.1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = alpha;
        ctx.font = `${p.fontSize}px "Space Mono", monospace`;
        ctx.fillStyle = '#5b47e0';
        ctx.fillText(p.text, 0, 0);
        ctx.restore();

        // Reset if off screen or life ended
        if (p.y < -30 || p.life <= 0 || p.x < -200 || p.x > canvas.width + 200) {
          particles[idx] = makeParticle(false);
        }
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 1,
      }}
    />
  );
}

// Cursor glow
function CursorGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let raf;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    function onMove(e) {
      tx = e.clientX;
      ty = e.clientY;
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      cx = lerp(cx, tx, 0.08);
      cy = lerp(cy, ty, 0.08);
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      raf = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="cursor-glow"
      style={{ left: -300, top: -300 }}
    />
  );
}

// ── Inactivity warning toast ───────────────────────────────
function InactivityWarning({ visible, secondsLeft }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'rgba(255,255,255,0.96)',
      border: '1.5px solid rgba(245,166,35,0.35)',
      borderRadius: 16,
      padding: '14px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      animation: 'fadeUp 0.3s ease both',
      whiteSpace: 'nowrap',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(245,166,35,0.12)',
        border: '1px solid rgba(245,166,35,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#c07d00" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M9 7.5V10.5" stroke="#c07d00" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="9" cy="13" r="0.75" fill="#c07d00"/>
        </svg>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1714', fontFamily: 'Instrument Sans, sans-serif' }}>
          Still there?
        </div>
        <div style={{ fontSize: 12, color: '#8c8680', marginTop: 1 }}>
          You'll be signed out in{' '}
          <span style={{ fontWeight: 700, color: '#c07d00', fontFamily: 'Space Mono' }}>
            {secondsLeft}s
          </span>{' '}
          due to inactivity
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────
export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const countdownRef = useRef(null);

  const publicPages = ['/', '/login', '/register', '/pricing', '/api-docs'];
  const isPublicPage = publicPages.includes(router.pathname);

  const doLogout = useCallback(() => {
    clearActivityTimer();
    clearInterval(countdownRef.current);
    setShowWarning(false);
    localStorage.clear();
    router.push('/login?reason=inactivity');
  }, [router]);

  const handleWarn = useCallback((isWarning) => {
    if (isWarning) {
      setSecondsLeft(120);
      setShowWarning(true);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { clearInterval(countdownRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownRef.current);
      setShowWarning(false);
      setSecondsLeft(120);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rs_token') : null;
    if (!token || isPublicPage) {
      clearActivityTimer();
      return;
    }
    startActivityTimer({ onWarn: handleWarn, onLogout: doLogout });
    return () => clearActivityTimer();
  }, [router.pathname, handleWarn, doLogout]);

  // Auth redirect guard
  useEffect(() => {
    const handleRouteChange = () => {
      const authPages = ['/login', '/register'];
      if (authPages.includes(router.pathname)) {
        try {
          const token = localStorage.getItem('rs_token');
          if (token) router.replace('/dashboard');
        } catch {}
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  return (
    <>
      <FloatingNumbers />
      <CursorGlow />
      <Component {...pageProps} />
      <InactivityWarning visible={showWarning} secondsLeft={secondsLeft} />
    </>
  );
}
