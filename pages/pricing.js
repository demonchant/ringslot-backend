import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import ServiceLogo from '../components/ServiceLogo';

export default function Pricing() {
  const [services, setServices] = useState([]);
  useEffect(() => { api.get('/services').then(({data}) => setServices(data)).catch(() => {}); }, []);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
        <div style={{ maxWidth: 560, marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 16 }}>Simple pricing</h1>
          <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.7, fontWeight: 300 }}>
            Simple, transparent pricing. You only pay for what you use. Unused numbers are refunded automatically in full.
          </p>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, flex: 2 }}>SERVICE</span>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, flex: 1 }}>MARKUP</span>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, flex: 1 }}>FROM</span>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, flex: 1 }}></span>
          </div>
          {services.map((s, i) => (
            <div key={s.service_key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: i < services.length-1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                <ServiceLogo serviceKey={s.service_key} size={32} />
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{s.display_name}</span>
              </div>
              <span style={{ flex: 1, fontFamily: 'Geist Mono, monospace', fontSize: 13, color: 'var(--accent)' }}>From ~$0.10</span>
              <span style={{ flex: 1, fontFamily: 'Geist Mono, monospace', fontSize: 13, color: 'var(--text3)' }}>~$0.10</span>
              <span style={{ flex: 1 }}><a href="/dashboard"><button className="btn btn-secondary btn-sm">Buy now</button></a></span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { title: 'Auto refund', desc: 'No OTP received in 2 minutes? Full refund automatically, no questions asked.' },
            { title: 'Smart routing', desc: 'RingSlot automatically selects the best available number for your request in real time.' },
            { title: 'No hidden fees', desc: 'The price you see is what you pay. No surprises, no subscriptions.' },
          ].map(item => (
            <div key={item.title} className="card-sm" style={{ borderRadius: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: 'var(--text)' }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
