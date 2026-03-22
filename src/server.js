import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { globalLimiter, blockIpMiddleware } from './middleware/rateLimit.js';
import routes from './routes/index.js';
import logger from './utils/logger.js';
import pool from './config/database.js';
import redis from './config/redis.js';
import { startPoller, recoverPending } from './services/otpPoller.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Trust Render/Nginx proxy
app.set('trust proxy', 1);

// CORS — accepts multiple origins
const ALLOWED_ORIGINS = [
  'https://ringslot.shop',
  'https://www.ringslot.shop',
  'https://ringslot-frontend.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || process.env.FRONTEND_URL === '*') {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now — tighten after custom domain works
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// Rate limit + IP blocker
app.use(globalLimiter);
app.use(blockIpMiddleware);

// Body parsing (webhook route handles its own raw body inside routes/index.js)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// All API routes under /api
app.use('/api', routes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

// Boot
async function boot() {
  try {
    // Test DB
    await pool.query('SELECT 1');
    logger.info('PostgreSQL connected');

    // Connect Redis
    await redis.connect();

    // Start OTP background poller
    startPoller();
    await recoverPending();

    app.listen(PORT, () => logger.info(`RingSlot API running on port ${PORT}`));
  } catch (err) {
    logger.error('Boot failed — check DATABASE_URL and REDIS_URL', { error: err.message });
    process.exit(1);
  }
}

boot();
