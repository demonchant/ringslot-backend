-- ============================================================
-- RingSlot v2 — Addons
-- Run this AFTER the main schema.sql
-- Safe to run even if already partially applied
-- ============================================================

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    VARCHAR(255) NOT NULL,
  category   VARCHAR(50) DEFAULT 'general'
               CHECK (category IN ('general','deposit','order','account','other')),
  status     VARCHAR(20) DEFAULT 'open'
               CHECK (status IN ('open','answered','pending','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support messages (threaded per ticket)
CREATE TABLE IF NOT EXISTS support_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role   VARCHAR(10) NOT NULL CHECK (sender_role IN ('user','admin')),
  message       TEXT NOT NULL,
  read_by_user  BOOLEAN DEFAULT FALSE,
  read_by_admin BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_user_id   ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status    ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_messages_ticket   ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread   ON support_messages(read_by_admin) WHERE read_by_admin = FALSE;
