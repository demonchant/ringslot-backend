import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import QRCode from '../components/QRCode';
import api from '../utils/api';

const COINS = {
  usdttrc20: { name: 'USDT TRC20', short: 'USDT', color: '#26a17b', note: 'Lowest fees', minAmount: 5 },
  usdterc20: { name: 'USDT ERC20', short: 'USDT', color: '#26a17b', note: '',             minAmount: 20 },
  btc:       { name: 'Bitcoin',    short: 'BTC',  color: '#f7931a', note: '',             minAmount: 20 },
  eth:       { name: 'Ethereum',   short: 'ETH',  color: '#627eea', note: '',             minAmount: 20 },
  ltc:       { name: 'Litecoin',   short: 'LTC',  color: '#bfbbbb', note: '',             minAmount: 5  },
  usdc:      { name: 'USD Coin',   short: 'USDC', color: '#2775ca', note: '',             minAmount: 5  },
  trx:       { name: 'TRON',       short: 'TRX',  color: '#ef0027', note: '',             minAmount: 5  },
};

const STATUS_COLORS = {
  waiting:    'var(--warning)',
  confirming: 'var(--info)',
  finished:   'var(--success)',
  failed:     'var(--danger)',
  expired:    'var(--danger)',
};

const STATUS_LABELS = {
  waiting:    'Waiting for payment',
  confirming: 'Confirming on-chain',
  finished:   'Payment complete!',
  failed:     'Payment failed',
  expired:    'Payment expired',
};

import QRCode from '../components/QRCode';

export default function Deposit() {
  const [mounted, setMounted]   = useState(false);
  const [step, setStep]         = useState('form');
  const [coins, setCoins]       = useState(Object.keys(COINS));
  const [amount, setAmount]     = useState('');
  const [currency, setCurrency] = useState('usdttrc20');
  const [payment, setPayment]   = useState(null);
  const [status, setStatus]     = useState('waiting');
  const [copied, setCopied]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const poll = useRef(null);

  const coin = COINS[currency] || COINS.usdttrc20;
  const minAmount = coin.minAmount;

  // Reset error when currency changes
  useEffect(() => { setError(''); }, [currency]);

  useEffect(() => {
    setMounted(true);
    api.get('/wallet/currencies').then(({ data }) => {
      if (data?.length) setCoins(data.filter(c => COINS[c]));
    }).catch(() => {});
  }, []);

  async function create() {
    if (!amount || parseFloat(amount) < minAmount) {
      return setError(`Minimum deposit for ${coin.name} is $${minAmount}.00`);
    }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/wallet/deposit', { amount: parseFloat(amount), currency });
      setPayment(data);
      setStep('paying');
      poll.current = setInterval(async () => {
        try {
          const { data: s } = await api.get(`/wallet/deposit/${data.paymentId}/status`);
          setStatus(s.status);
          if (s.status === 'finished') { clearInterval(poll.current); setStep('done'); }
          if (['failed', 'expired'].includes(s.status)) clearInterval(poll.current);
        } catch {}
      }, 8000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create payment. Try again.');
    }
    setLoading(false);
  }

  useEffect(() => () => clearInterval(poll.current), []);

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  function reset() {
    clearInterval(poll.current);
    setStep('form'); setPayment(null); setStatus('waiting'); setError('');
  }

  if (!mounted) return null;

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.waiting;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 580 }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Deposit funds</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>Crypto only · Spend-only · No withdrawals</p>
        </div>

        {/* ── FORM STEP ─────────────────────────────────────── */}
        {step === 'form' && (
          <div className="card fade-up">
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <div className="field">
              <label className="label">Amount (USD)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {['5','10','20','50','100'].map(v => (
                  <button key={v} onClick={() => setAmount(v)} style={{
                    padding: '7px 14px', borderRadius: 6,
                    border: `1px solid ${amount === v ? 'var(--accent)' : 'var(--border)'}`,
                    background: amount === v ? 'var(--accent-dim)' : 'var(--bg2)',
                    color: amount === v ? 'var(--accent)' : 'var(--text3)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}>${v}</button>
                ))}
              </div>
              <input className="input" type="number" min={minAmount} placeholder={`Minimum $${minAmount}`}
                value={amount} onChange={e => setAmount(e.target.value)} />
            </div>

            <div className="field" style={{ marginBottom: 24 }}>
              <label className="label">Pay with</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {coins.map(c => {
                  const info = COINS[c]; if (!info) return null;
                  return (
                    <button key={c} onClick={() => setCurrency(c)} style={{
                      padding: '12px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      border: `1px solid ${currency === c ? info.color : 'var(--border)'}`,
                      background: currency === c ? `${info.color}12` : 'var(--bg2)',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono, monospace', color: currency === c ? info.color : 'var(--text3)' }}>
                        {info.short}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                        {c.includes('trc') ? 'TRC20' : c.includes('erc') ? 'ERC20' : info.name.split(' ').slice(-1)[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {coin?.note && <p style={{ fontSize: 12, color: 'var(--success)' }}>✓ {coin.note}</p>}
                <p style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                  Min for {coin?.short}: <strong style={{ color: 'var(--text)' }}>${minAmount}</strong>
                </p>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={create} disabled={loading}>
              {loading ? 'Generating address...' : `Generate ${coin?.name} address`}
            </button>
          </div>
        )}

        {/* ── PAYING STEP ───────────────────────────────────── */}
        {step === 'paying' && payment && (
          <div className="card fade-up">

            {/* Status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: `${statusColor}10`, border: `1px solid ${statusColor}30`,
              borderRadius: 8, marginBottom: 24,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span style={{ fontSize: 14, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>Checking every 8s</span>
            </div>

            {/* Amount to send */}
            <div style={{ padding: '20px 24px', background: 'var(--bg2)', borderRadius: 10, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Send Exactly
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: coin?.color || 'var(--accent)', letterSpacing: '-0.02em' }}>
                {payment.payAmount} {payment.payCurrency?.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>≈ ${payment.usdAmount} USD</div>
            </div>

            {/* QR Code + Address side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center', marginBottom: 20 }}>
              
              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Scan QR
                </div>
                <QRCode value={payment.payAddress} size={160} />
              </div>

              {/* Address */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Or copy address
                </div>
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '12px 14px', marginBottom: 10,
                  fontFamily: 'Geist Mono, monospace', fontSize: 11,
                  color: 'var(--text2)', wordBreak: 'break-all', lineHeight: 1.6,
                }}>
                  {payment.payAddress}
                </div>
                <button className="btn btn-primary btn-sm btn-full" onClick={() => copy(payment.payAddress, 'addr')}>
                  {copied === 'addr' ? '✓ Copied!' : '📋 Copy Address'}
                </button>
              </div>
            </div>

            {/* Also copy amount */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Amount</div>
                <div className="mono" style={{ fontSize: 14, color: 'var(--text)', fontWeight: 700 }}>
                  {payment.payAmount} {payment.payCurrency?.toUpperCase()}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => copy(payment.payAmount, 'amt')} style={{ flexShrink: 0 }}>
                {copied === 'amt' ? '✓' : 'Copy'}
              </button>
            </div>

            {/* Warning */}
            <div style={{
              padding: '12px 14px', background: 'rgba(245,166,35,0.06)',
              border: '1px solid rgba(245,166,35,0.15)', borderRadius: 8,
              fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 16,
            }}>
              ⚠️ Send the <strong style={{ color: 'var(--text)' }}>exact amount</strong> shown above. Sending a different amount may delay or fail your deposit.
            </div>

            <button className="btn btn-ghost btn-full" onClick={reset}>← Start over</button>
          </div>
        )}

        {/* ── DONE STEP ─────────────────────────────────────── */}
        {step === 'done' && (
          <div className="card fade-up" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(0,229,153,0.1)', border: '1px solid rgba(0,229,153,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28, color: 'var(--success)',
            }}>✓</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>Deposit confirmed!</h2>
            <p style={{ color: 'var(--text3)', marginBottom: 28 }}>${payment.usdAmount} has been added to your wallet.</p>
            <a href="/dashboard"><button className="btn btn-primary btn-lg">Go to Dashboard →</button></a>
          </div>
        )}

      </div>
    </div>
  );
}
