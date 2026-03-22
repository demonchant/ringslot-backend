import { useState, useEffect } from 'react';

export default function TestApi() {
  const [mounted, setMounted] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => { setMounted(true); }, []);

  async function runTest() {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    const actualUrl = (envUrl || 'https://ringslot-backend.onrender.com').replace(/\/$/, '');
    
    setResults([
      { label: 'ENV: NEXT_PUBLIC_API_URL', value: envUrl || '(not set — using fallback)', ok: !!envUrl },
      { label: 'Actual API base URL', value: actualUrl + '/api', ok: true },
    ]);

    // Test health
    try {
      const r = await fetch(`${actualUrl}/health`);
      const d = await r.json();
      setResults(prev => [...prev, { label: `Health check (${r.status})`, value: JSON.stringify(d), ok: r.ok }]);
    } catch (e) {
      setResults(prev => [...prev, { label: 'Health check FAILED', value: e.message, ok: false }]);
    }

    // Test register route exists
    try {
      const r = await fetch(`${actualUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `test_${Date.now()}@test.com`, password: 'testpass123' })
      });
      const d = await r.json();
      setResults(prev => [...prev, { label: `Register route (${r.status})`, value: JSON.stringify(d), ok: r.status !== 404 }]);
    } catch (e) {
      setResults(prev => [...prev, { label: 'Register route FAILED', value: e.message, ok: false }]);
    }
  }

  if (!mounted) return null;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 32, fontFamily: 'monospace', color: '#ededed' }}>
      <h1 style={{ marginBottom: 24, color: '#00e599' }}>API Diagnostics</h1>
      <button onClick={runTest} style={{ background: '#00e599', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, marginBottom: 24, fontSize: 14 }}>
        Run Tests
      </button>
      {results.map((r, i) => (
        <div key={i} style={{ marginBottom: 12, padding: 14, background: '#111', borderRadius: 8, borderLeft: `3px solid ${r.ok ? '#00e599' : '#ff4444'}` }}>
          <div style={{ fontWeight: 700, color: r.ok ? '#00e599' : '#ff4444', marginBottom: 6 }}>{r.label}</div>
          <div style={{ color: '#a1a1a1', fontSize: 13, wordBreak: 'break-all' }}>{r.value}</div>
        </div>
      ))}
      <div style={{ marginTop: 24 }}>
        <a href="/" style={{ color: '#00e599' }}>← Back to home</a>
      </div>
    </div>
  );
}
