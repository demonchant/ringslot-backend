-- RingSlot Complete Schema
-- Run this entire file in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  api_key       VARCHAR(64) UNIQUE NOT NULL,
  role          VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    NUMERIC(12,4) DEFAULT 0.0000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     NUMERIC(12,4) NOT NULL,
  type       VARCHAR(30) NOT NULL CHECK (type IN ('deposit','pending_deposit','deduct','refund','admin_withdraw')),
  reference  TEXT,
  meta       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_key  VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  markup       NUMERIC(5,3) DEFAULT 1.50,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Providers
CREATE TABLE IF NOT EXISTS providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name VARCHAR(100) UNIQUE NOT NULL,
  api_key       TEXT NOT NULL,
  base_url      TEXT NOT NULL,
  enabled       BOOLEAN DEFAULT TRUE,
  priority      INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
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
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Revenue
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

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES users(id),
  amount      NUMERIC(12,4) NOT NULL,
  method      VARCHAR(30) NOT NULL CHECK (method IN ('crypto_usdt','crypto_btc')),
  destination TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- OTP Poll Queue
CREATE TABLE IF NOT EXISTS otp_poll_queue (
  order_id          UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  provider          VARCHAR(100) NOT NULL,
  provider_order_id VARCHAR(255) NOT NULL,
  poll_count        INTEGER DEFAULT 0,
  next_poll_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked IPs
CREATE TABLE IF NOT EXISTS blocked_ips (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  reason     TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_txn_user_id       ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_created   ON platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_next         ON otp_poll_queue(next_poll_at);

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
  ('uber',      'Uber',       1.45)
ON CONFLICT (service_key) DO NOTHING;
