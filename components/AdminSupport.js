import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const STATUS_OPTIONS = ['open', 'answered', 'pending', 'closed'];

const STATUS_STYLE = {
  open:     { color: 'var(--warning)', bg: 'rgba(255,165,2,.12)' },
  answered: { color: 'var(--success)', bg: 'rgba(0,200,150,.12)' },
  pending:  { color: 'var(--accent)',  bg: 'rgba(0,229,255,.1)'  },
  closed:   { color: 'var(--muted)',   bg: 'rgba(90,122,138,.12)'},
};

export default function AdminSupport() {
  const [tickets, setTickets]   = useState([]);
  const [filter, setFilter]     = useState('');
  const [active, setActive]     = useState(null);
  const [reply, setReply]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadTickets();
    loadUnread();
  }, [filter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  async function loadTickets() {
    try {
      const url = filter ? `/admin/support/tickets?status=${filter}` : '/admin/support/tickets';
      const { data } = await api.get(url);
      setTickets(data);
    } catch {}
  }

  async function loadUnread() {
    try {
      const { data } = await api.get('/admin/support/unread');
      setUnread(data.unread);
    } catch {}
  }

  async function openTicket(id) {
    try {
      const { data } = await api.get(`/admin/support/tickets/${id}`);
      setActive(data);
      loadTickets();
      loadUnread();
    } catch {}
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setLoading(true);
    try {
      await api.post(`/admin/support/tickets/${active.ticket.id}/reply`, { message: reply });
      setReply('');
      const { data } = await api.get(`/admin/support/tickets/${active.ticket.id}`);
      setActive(data);
      loadTickets();
    } catch {}
    setLoading(false);
  }

  async function setStatus(status) {
    await api.post(`/admin/support/tickets/${active.ticket.id}/status`, { status });
    setActive((prev) => ({ ...prev, ticket: { ...prev.ticket, status } }));
    loadTickets();
  }

  const ss = (s) => STATUS_STYLE[s] || STATUS_STYLE.open;

  if (active) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setActive(null); loadTickets(); }}>← All Tickets</button>
          <span style={{ fontWeight: 700 }}>{active.ticket.subject}</span>
          <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>from {active.ticket.user_email}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding: '3px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: active.ticket.status === s ? ss(s).bg : 'var(--surface2)',
                color: active.ticket.status === s ? ss(s).color : 'var(--muted)',
                fontSize: '.75rem', fontWeight: 700,
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', minHeight: 300, maxHeight: 480, overflowY: 'auto' }}>
          {active.messages.map((m) => {
            const isAdmin = m.sender_role === 'admin';
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
                <div style={{
                  maxWidth: '75%',
                  background: isAdmin ? 'rgba(0,229,255,.1)' : 'var(--surface2)',
                  border: `1px solid ${isAdmin ? 'rgba(0,229,255,.25)' : 'var(--border)'}`,
                  borderRadius: isAdmin ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  padding: '.75rem 1rem',
                }}>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '.35rem', fontWeight: 700 }}>
                    {isAdmin ? '🛡️ You (Admin)' : `👤 ${active.ticket.user_email}`} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply */}
        {active.ticket.status !== 'closed' && (
          <div className="card">
            <form onSubmit={sendReply}>
              <textarea className="input" rows={3} placeholder="Type your reply to the user..."
                value={reply} onChange={(e) => setReply(e.target.value)}
                style={{ resize: 'none', marginBottom: '.75rem', fontFamily: 'Syne, sans-serif' }} />
              <button className="btn btn-primary" type="submit" disabled={loading || !reply.trim()}>
                {loading ? 'Sending...' : 'Send Reply'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>Support Tickets</span>
        {unread > 0 && (
          <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>
            {unread} unread
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.5rem' }}>
          <button onClick={() => setFilter('')} className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-outline'}`}>All</button>
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem 0' }}>No tickets</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>User</th><th>Subject</th><th>Category</th><th>Status</th><th>Unread</th><th>Updated</th><th></th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{t.user_email}</td>
                    <td style={{ fontWeight: 600 }}>{t.subject}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{t.category}</td>
                    <td>
                      <span style={{ background: ss(t.status).bg, color: ss(t.status).color, padding: '2px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700 }}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {t.unread > 0 && (
                        <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '.7rem', fontWeight: 800, padding: '1px 7px', borderRadius: 10 }}>
                          {t.unread}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{new Date(t.updated_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openTicket(t.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
