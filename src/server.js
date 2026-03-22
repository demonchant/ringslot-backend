import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

import { globalLimiter, blockIpMiddleware } from './middleware/rateLimit.js';
import routes from './routes/index.js';
import logger from './utils/logger.js';
import redis from './config/redis.js';
import { startPoller, recoverPending } from './services/otpPoller.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.use(globalLimiter);
app.use(blockIpMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

async function boot() {
  // ── Step 1: Check env vars are present ──────────────────────
  const dbUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  if (!dbUrl) {
    logger.error('DATABASE_URL is missing from environment variables');
    process.exit(1);
  }
  if (!redisUrl) {
    logger.error('REDIS_URL is missing from environment variables');
    process.exit(1);
  }

  // Log sanitized URL (hide password)
  const sanitizedDb = dbUrl.replace(/:([^@]+)@/, ':***@');
  logger.info(`Attempting DB connection to: ${sanitizedDb}`);

  // ── Step 2: Try database connection ─────────────────────────
  try {
    const { Pool } = pg;
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
      family: 4,
    });
    await pool.query('SELECT 1');
    logger.info('PostgreSQL connected successfully');

    // ── Step 3: Try Redis connection ───────────────────────────
    try {
      await redis.connect();
      logger.info('Redis connected successfully');
    } catch (redisErr) {
      logger.error('Redis connection failed', { error: redisErr.message });
      process.exit(1);
    }

    // ── Step 4: Start services ─────────────────────────────────
    startPoller();
    await recoverPending();

    app.listen(PORT, () => logger.info(`RingSlot API running on port ${PORT}`));

  } catch (dbErr) {
    logger.error('Database connection failed', { error: dbErr.message });
    logger.error('Check your DATABASE_URL format and password');
    process.exit(1);
  }
}

boot();
