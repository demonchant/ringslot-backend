import Navbar from '../components/Navbar';

function Endpoint({ method, path, auth, desc, body, response }) {
  const color = method === 'GET' ? 'var(--success)' : 'var(--info)';
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 700, color, background: `${color}12`, border: `1px solid ${color}25`, padding: '3px 8px', borderRadius: 4 }}>{method}</span>
        <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, color: 'var(--text)' }}>{path}</span>
        {auth && <span style={{ fontSize: 11, color: 'var(--warning)', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>AUTH</span>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: body || response ? 12 : 0 }}>{desc}</p>
      {body && <pre style={{ background: 'var(--bg2)', padding: '12px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'Geist Mono, monospace', color: 'var(--text2)', overflowX: 'auto', border: '1px solid var(--border)', marginBottom: 8 }}>{JSON.stringify(body, null, 2)}</pre>}
      {response && <pre style={{ background: 'rgba(0,229,153,0.04)', padding: '12px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'Geist Mono, monospace', color: 'var(--success)', overflowX: 'auto', border: '1px solid rgba(0,229,153,0.15)' }}>{JSON.stringify(response, null, 2)}</pre>}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: 60, paddingBottom: 80, maxWidth: 760 }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 12 }}>API Reference</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>Base URL</span>
          <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, color: 'var(--text)' }}>{process.env.NEXT_PUBLIC_API_URL}/api</code>
        </div>

        <div style={{ padding: '16px 20px', background: 'rgba(77,166,255,0.06)', border: '1px solid rgba(77,166,255,0.15)', borderRadius: 8, marginBottom: 40, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--info)' }}>Authentication</strong> — Add <code style={{ fontFamily: 'Geist Mono, monospace', background: 'var(--bg2)', padding: '1px 6px', borderRadius: 3 }}>X-API-Key: your_key</code> header to all protected endpoints. Find your key in Dashboard → API key.
        </div>

        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Authentication</h2>
        <Endpoint method="POST" path="/auth/register" desc="Create a new account" body={{ email: "you@example.com", password: "password123" }} response={{ token: "jwt...", apiKey: "rs_...", user: { id: "uuid", email: "you@example.com", role: "user" } }} />
        <Endpoint method="POST" path="/auth/login" desc="Sign in and get token" body={{ email: "you@example.com", password: "password123" }} response={{ token: "jwt...", apiKey: "rs_..." }} />
        <Endpoint method="GET" path="/me" auth desc="Get your account info and balance" />

        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 32, marginBottom: 4 }}>Numbers</h2>
        <Endpoint method="GET" path="/services" desc="List all available services with markups" />
        <Endpoint method="POST" path="/orders/buy" auth desc="Purchase a virtual number" body={{ service: "telegram", country: "any" }} response={{ orderId: "uuid", number: "+1234567890", price: 0.15, status: "waiting" }} />
        <Endpoint method="GET" path="/orders/sms?id=ORDER_ID" auth desc="Poll for OTP code (call every 5 seconds)" response={{ status: "received", otp: "123456", number: "+1234567890" }} />
        <Endpoint method="POST" path="/orders/cancel" auth desc="Cancel order and receive full refund" body={{ id: "order_uuid" }} response={{ success: true, refunded: 0.15 }} />
        <Endpoint method="GET" path="/orders" auth desc="Get your order history (last 50)" />

        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 32, marginBottom: 4 }}>Wallet</h2>
        <Endpoint method="GET" path="/wallet/balance" auth desc="Get current balance" response={{ balance: 5.0000 }} />
        <Endpoint method="POST" path="/wallet/deposit" auth desc="Create a crypto deposit" body={{ amount: 10, currency: "usdttrc20" }} response={{ paymentId: "np_xxx", payAddress: "TXxx...", payAmount: "10.0", payCurrency: "usdttrc20", usdAmount: 10 }} />
        <Endpoint method="GET" path="/wallet/deposit/:id/status" auth desc="Check deposit status" response={{ status: "finished" }} />
        <Endpoint method="GET" path="/wallet/transactions" auth desc="Get transaction history" />
      </div>
    </div>
  );
}
