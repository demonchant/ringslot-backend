-- ============================================================
-- RingSlot Complete Schema
-- PostgreSQL 14+
-- Run this entire file to set up the database from scratch.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  api_key       VARCHAR(64) UNIQUE NOT NULL,
  role          VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER DEVICES (trusted device verification)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_hash   VARCHAR(128) NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  label         VARCHAR(255),
  verified      BOOLEAN DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_hash)
);

-- ============================================================
-- LOGIN TOKENS (device verification email tokens)
-- ============================================================
CREATE TABLE IF NOT EXISTS login_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(128) UNIQUE NOT NULL,
  device_hash   VARCHAR(128) NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(128) UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WALLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(12,4) DEFAULT 0.0000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     NUMERIC(12,4) NOT NULL,
  type       VARCHAR(30) NOT NULL CHECK (type IN ('deposit','pending_deposit','deduct','refund','admin_withdraw')),
  reference  TEXT,
  meta       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_key  VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  markup       NUMERIC(5,3) DEFAULT 1.50,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROVIDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name VARCHAR(100) UNIQUE NOT NULL,
  api_key       TEXT NOT NULL,
  base_url      TEXT NOT NULL,
  enabled       BOOLEAN DEFAULT TRUE,
  priority      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          VARCHAR(100) NOT NULL,
  provider_order_id VARCHAR(255) NOT NULL,
  service           VARCHAR(100) NOT NULL,
  phone_number      VARCHAR(30),
  otp               TEXT,
  status            VARCHAR(30) DEFAULT 'waiting' CHECK (status IN ('waiting','received','cancelled','expired','refunded')),
  provider_price    NUMERIC(10,4) NOT NULL,
  user_price        NUMERIC(10,4) NOT NULL,
  profit            NUMERIC(10,4) DEFAULT 0,
  country           VARCHAR(10) DEFAULT 'any',
  is_rental         BOOLEAN DEFAULT FALSE,
  rental_expires_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLATFORM REVENUE
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_revenue (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_cost NUMERIC(10,4) NOT NULL,
  user_paid     NUMERIC(10,4) NOT NULL,
  profit        NUMERIC(10,4) GENERATED ALWAYS AS (user_paid - provider_cost) STORED,
  service       VARCHAR(100),
  provider      VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WITHDRAWALS
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES users(id),
  amount       NUMERIC(12,4) NOT NULL,
  method       VARCHAR(30) NOT NULL CHECK (method IN ('crypto_usdt','crypto_btc')),
  destination  TEXT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  meta         JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================================
-- OTP POLL QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_poll_queue (
  order_id          UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  provider          VARCHAR(100) NOT NULL,
  provider_order_id VARCHAR(255) NOT NULL,
  poll_count        INTEGER DEFAULT 0,
  next_poll_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOCKED IPS
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_ips (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  reason     TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
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

-- ============================================================
-- SUPPORT MESSAGES
-- ============================================================
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_rental         ON orders(is_rental) WHERE is_rental = TRUE;
CREATE INDEX IF NOT EXISTS idx_txn_user_id           ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_created       ON platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_next             ON otp_poll_queue(next_poll_at);
CREATE INDEX IF NOT EXISTS idx_devices_user          ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_hash          ON user_devices(user_id, device_hash);
CREATE INDEX IF NOT EXISTS idx_login_tokens_token    ON login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_login_tokens_user     ON login_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token    ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id       ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_messages_ticket       ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread       ON support_messages(read_by_admin) WHERE read_by_admin = FALSE;

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default services
INSERT INTO services (service_key, display_name, markup) VALUES
  ('telegram',  'Telegram',   1.50),
  ('google',    'Google',     1.40),
  ('discord',   'Discord',    1.60),
  ('whatsapp',  'WhatsApp',   1.50),
  ('facebook',  'Facebook',   1.45),
  ('twitter',   'Twitter/X',  1.50),
  ('instagram', 'Instagram',  1.55),
  ('tiktok',    'TikTok',     1.50),
  ('amazon',    'Amazon',     1.40),
  ('uber',      'Uber',       1.45),
  ('openai',    'OpenAI',     1.60),
  ('binance',   'Binance',    1.55),
  ('coinbase',  'Coinbase',   1.55),
  ('yahoo',     'Yahoo',      1.40),
  ('microsoft', 'Microsoft',  1.45),
  ('snapchat',  'Snapchat',   1.50),
  ('linkedin',  'LinkedIn',   1.45),
  ('spotify',   'Spotify',    1.40),
  ('netflix',   'Netflix',    1.45),
  ('steam',     'Steam',      1.50)
ON CONFLICT (service_key) DO NOTHING;

-- Default providers
INSERT INTO providers (provider_name, api_key, base_url, priority) VALUES
  ('smsactivate', 'SMSACTIVATE_API_KEY_PLACEHOLDER', 'https://api.sms-activate.io/stubs/handler_api.php', 1),
  ('smsman',      'SMSMAN_API_KEY_PLACEHOLDER',      'https://api.sms-man.com/control',                    2),
  ('fivesim',     'FIVESIM_API_KEY_PLACEHOLDER',     'https://5sim.net/v1',                                3)
ON CONFLICT (provider_name) DO NOTHING;
