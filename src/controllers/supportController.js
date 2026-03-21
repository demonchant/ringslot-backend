import { query, getClient } from '../config/database.js';
import logger from '../utils/logger.js';

// ─── User: Create ticket ──────────────────────────────────────
export async function createTicket(req, res) {
  try {
    const { subject, message, category = 'general' } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const { rows } = await query(
      `INSERT INTO support_tickets (user_id, subject, category)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.user.id, subject, category]
    );
    const ticketId = rows[0].id;

    await query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message)
       VALUES ($1, $2, 'user', $3)`,
      [ticketId, req.user.id, message]
    );

    logger.info('Support ticket created', { ticketId, userId: req.user.id });
    return res.status(201).json({ ticketId, message: 'Ticket created. We will respond shortly.' });
  } catch (err) {
    logger.error('Create ticket error', { error: err.message });
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
}

// ─── User: Get my tickets ─────────────────────────────────────
export async function getMyTickets(req, res) {
  const { rows } = await query(
    `SELECT t.id, t.subject, t.category, t.status, t.created_at, t.updated_at,
            (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS message_count,
            (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id AND m.sender_role = 'admin' AND m.read_by_user = FALSE) AS unread
     FROM support_tickets t
     WHERE t.user_id = $1
     ORDER BY t.updated_at DESC`,
    [req.user.id]
  );
  return res.json(rows);
}

// ─── User: Get ticket messages ────────────────────────────────
export async function getTicketMessages(req, res) {
  const { id } = req.params;

  // Verify ownership
  const { rows: ticket } = await query(
    'SELECT id, subject, status, category FROM support_tickets WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (!ticket.length) return res.status(404).json({ error: 'Ticket not found' });

  const { rows: messages } = await query(
    `SELECT id, sender_role, message, created_at FROM support_messages
     WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  // Mark admin messages as read
  await query(
    `UPDATE support_messages SET read_by_user = TRUE
     WHERE ticket_id = $1 AND sender_role = 'admin'`,
    [id]
  );

  return res.json({ ticket: ticket[0], messages });
}

// ─── User: Reply to ticket ────────────────────────────────────
export async function replyToTicket(req, res) {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const { rows: ticket } = await query(
    'SELECT id, status FROM support_tickets WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (!ticket.length) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket[0].status === 'closed') {
    return res.status(400).json({ error: 'This ticket is closed. Open a new one.' });
  }

  await query(
    `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message)
     VALUES ($1, $2, 'user', $3)`,
    [id, req.user.id, message]
  );

  await query(
    `UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  return res.json({ success: true });
}

// ─── User: Close ticket ───────────────────────────────────────
export async function closeMyTicket(req, res) {
  const { id } = req.params;
  const { rows } = await query(
    'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id',
    ['closed', id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });
  return res.json({ success: true });
}

// ─── Admin: Get all tickets ───────────────────────────────────
export async function adminGetAllTickets(req, res) {
  const { status } = req.query;
  const whereClause = status ? 'WHERE t.status = $1' : '';
  const params = status ? [status] : [];

  const { rows } = await query(
    `SELECT t.id, t.subject, t.category, t.status, t.created_at, t.updated_at,
            u.email AS user_email,
            (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS message_count,
            (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id AND m.sender_role = 'user' AND m.read_by_admin = FALSE) AS unread
     FROM support_tickets t
     JOIN users u ON u.id = t.user_id
     ${whereClause}
     ORDER BY
       CASE WHEN t.status = 'open' THEN 0 WHEN t.status = 'pending' THEN 1 ELSE 2 END,
       t.updated_at DESC`,
    params
  );
  return res.json(rows);
}

// ─── Admin: Get ticket messages ───────────────────────────────
export async function adminGetTicketMessages(req, res) {
  const { id } = req.params;

  const { rows: ticket } = await query(
    `SELECT t.id, t.subject, t.status, t.category, u.email AS user_email
     FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
    [id]
  );
  if (!ticket.length) return res.status(404).json({ error: 'Ticket not found' });

  const { rows: messages } = await query(
    `SELECT id, sender_role, message, created_at FROM support_messages
     WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  // Mark user messages as read by admin
  await query(
    `UPDATE support_messages SET read_by_admin = TRUE
     WHERE ticket_id = $1 AND sender_role = 'user'`,
    [id]
  );

  return res.json({ ticket: ticket[0], messages });
}

// ─── Admin: Reply to ticket ───────────────────────────────────
export async function adminReplyTicket(req, res) {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const { rows: ticket } = await query(
    'SELECT id FROM support_tickets WHERE id = $1',
    [id]
  );
  if (!ticket.length) return res.status(404).json({ error: 'Ticket not found' });

  await query(
    `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message)
     VALUES ($1, $2, 'admin', $3)`,
    [id, req.user.id, message]
  );

  await query(
    `UPDATE support_tickets SET status = 'answered', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  logger.info('Admin replied to ticket', { ticketId: id, adminId: req.user.id });
  return res.json({ success: true });
}

// ─── Admin: Change ticket status ──────────────────────────────
export async function adminSetTicketStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['open', 'answered', 'closed', 'pending'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
  }
  await query(
    'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, id]
  );
  return res.json({ success: true });
}

// ─── Admin: Get unread count (for badge) ─────────────────────
export async function adminUnreadCount(req, res) {
  const { rows } = await query(
    `SELECT COUNT(DISTINCT ticket_id) AS unread
     FROM support_messages
     WHERE sender_role = 'user' AND read_by_admin = FALSE`
  );
  return res.json({ unread: parseInt(rows[0].unread) });
}
