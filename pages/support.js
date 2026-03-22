import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const CATEGORIES = [
  { value: 'general',  label: 'General' },
  { value: 'deposit',  label: 'Deposit' },
  { value: 'order',    label: 'Order' },
  { value: 'account',  label: 'Account' },
  { value: 'other',    label: 'Other' },
];

const STATUS_STYLE = {
  open:     { color: 'var(--info)',    bg: 'rgba(77,166,255,0.1)' },
  answered: { color: 'var(--success)', bg: 'rgba(0,200,150,0.1)' },
  pending:  { color: 'var(--warning)', bg: 'rgba(245,166,35,0.1)' },
  closed:   { color: 'var(--text3)',   bg: 'rgba(255,255,255,0.05)' },
};

export default function Support() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView]       = useState('list');
  const [tickets, setTickets] = useState([]);
  const [active, setActive]   = useState(null);
  const [newForm, setNewForm] = useState({ subject: '', category: 'general', message: '' });
  const [reply, setReply]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const u = localStorage.getItem('rs_user');
    if (!u) { router.push('/login'); return; }
    loadTickets();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  async function loadTickets() {
    try { const { data } = await api.get('/support/tickets'); setTickets(data); } catch {}
  }

  async function openTicket(id) {
    try {
      const { data } = await api.get(`/support/tickets/${id}`);
      setActive(data); setView('thread');
      loadTickets();
    } catch {}
  }

  async function submitNew(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/support/tickets', newForm);
      setSuccess('Ticket submitted! We will respond shortly.');
      setNewForm({ subject: '', category: 'general', message: '' });
      loadTickets();
      setTimeout(() => { setSuccess(''); setView('list'); }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit ticket');
    }
    setLoading(false);
  }

  async function submitReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setLoading(true);
    try {
      await api.post(`/support/tickets/${active.ticket.id}/reply`, { message: reply });
      setReply('');
      const { data } = await api.get(`/support/tickets/${active.ticket.id}`);
      setActive(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reply');
    }
    setLoading(false);
  }

  async function closeTicket() {
    if (!confirm('Close this ticket?')) return;
    await api.post(`/support/tickets/${active.ticket.id}/close`);
    loadTickets(); setView('list'); setActive(null);
  }

  const ss = (s) => STATUS_STYLE[s] || STATUS_STYLE.open;

  if (!mounted) return null;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 860 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Support</h1>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>
              Need help? Open a ticket or email <a href="mailto:support@ringslot.shop" style={{ color: 'var(--accent)' }}>support@ringslot.shop</a>
            </p>
          </div>
          {view === 'list' && (
            <button className="btn btn-primary" onClick={() => { setView('new'); setError(''); setSuccess(''); }}>
              + New ticket
            </button>
          )}
          {view !== 'list' && (
            <button className="btn btn-ghost" onClick={() => { setView('list'); setActive(null); setError(''); }}>
              ← Back to tickets
            </button>
          )}
        </div>

        {/* New ticket */}
        {view === 'new' && (
          <div className="card fade-up">
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Open new ticket</h3>
            {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
            <form onSubmit={submitNew}>
              <div className="field">
                <label className="label">Category</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setNewForm({ ...newForm, category: c.value })} style={{
                      padding: '6px 14px', borderRadius: 6, border: `1px solid ${newForm.category === c.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: newForm.category === c.value ? 'var(--accent-dim)' : 'var(--bg2)',
                      color: newForm.category === c.value ? 'var(--accent)' : 'var(--text3)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="label">Subject</label>
                <input className="input" placeholder="Brief summary of your issue"
                  value={newForm.subject} onChange={e => setNewForm({ ...newForm, subject: e.target.value })} required />
              </div>
              <div className="field" style={{ marginBottom: 24 }}>
                <label className="label">Message</label>
                <textarea className="input" rows={5} placeholder="Describe your issue in detail. Include order IDs or transaction IDs if relevant."
                  value={newForm.message} onChange={e => setNewForm({ ...newForm, message: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'DM Sans, sans-serif' }} required />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit ticket'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setView('list')}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket list */}
        {view === 'list' && (
          <div className="fade-up">
            {tickets.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🎫</div>
                <p style={{ fontWeight: 600, marginBottom: 6 }}>No tickets yet</p>
                <p style={{ fontSize: 14 }}>Open a ticket if you need help</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tickets.map(t => (
                  <div key={t.id} className="card" style={{ cursor: 'pointer', borderColor: t.unread > 0 ? 'var(--accent)' : 'var(--border)' }}
                    onClick={() => openTicket(t.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{t.subject}</span>
                          {t.unread > 0 && (
                            <span style={{ background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 10 }}>
                              {t.unread} new
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--text3)', fontSize: 13 }}>
                          {t.category} · {t.message_count} message{t.message_count !== 1 ? 's' : ''} · {new Date(t.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ background: ss(t.status).bg, color: ss(t.status).color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thread */}
        {view === 'thread' && active && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{active.ticket.subject}</div>
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>{active.ticket.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ background: ss(active.ticket.status).bg, color: ss(active.ticket.status).color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  {active.ticket.status}
                </span>
                {active.ticket.status !== 'closed' && (
                  <button className="btn btn-ghost btn-sm" onClick={closeTicket}>Close ticket</button>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: 16, minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
              {active.messages.map(m => {
                const isAdmin = m.sender_role === 'admin';
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end', marginBottom: 16 }}>
                    <div style={{
                      maxWidth: '75%',
                      background: isAdmin ? 'var(--bg2)' : 'rgba(0,229,153,0.08)',
                      border: `1px solid ${isAdmin ? 'var(--border)' : 'rgba(0,229,153,0.2)'}`,
                      borderRadius: isAdmin ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                      padding: '12px 14px',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
                        {isAdmin ? '🛡️ Support Team' : '👤 You'} · {new Date(m.created_at).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {active.ticket.status !== 'closed' ? (
              <div className="card">
                {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
                <form onSubmit={submitReply}>
                  <textarea className="input" rows={3} placeholder="Type your reply..."
                    value={reply} onChange={e => setReply(e.target.value)}
                    style={{ resize: 'none', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }} />
                  <button className="btn btn-primary" type="submit" disabled={loading || !reply.trim()}>
                    {loading ? 'Sending...' : 'Send reply'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 16, fontSize: 14 }}>
                This ticket is closed.{' '}
                <button className="btn btn-ghost btn-sm" onClick={() => setView('new')}>Open new ticket</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
