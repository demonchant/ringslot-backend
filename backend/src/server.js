import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { globalLimiter, blockIpMiddleware } from './middleware/rateLimit.js';
import routes from './routes/index.js';
import logger from './utils/logger.js';
import pool from './config/database.js';
import redis from './config/redis.js';
import { startPoller, recoverPending } from './services/otpPoller.js';
import { seedServicesIfEmpty } from './services/seedServices.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

const ALLOWED = [
  'https://ringslot.shop', 'https://www.ringslot.shop',
  'https://ringslot-frontend.vercel.app', process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, true), // permit all — tighten after stable
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-API-Key'],
  credentials: true,
}));

app.use(globalLimiter);
app.use(blockIpMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status:'ok', ts: new Date().toISOString() }));
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ error:'Not found' }));
app.use((err, _req, res, _next) => {
  logger.error('Unhandled', { error: err.message });
  res.status(500).json({ error:'Internal server error' });
});

function startKeepAlive() {
  const url = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      const r = await fetch(`${url}/health`);
      logger.info(`Keep-alive: ${r.status}`);
    } catch (err) {
      logger.warn('Keep-alive failed', { error: err.message });
    }
  }, 14 * 60 * 1000); // every 14 min — prevents Render sleep
  logger.info('Keep-alive started (14 min interval)');
}

async function boot() {
  try {
    await pool.query('SELECT 1');
    logger.info('PostgreSQL connected');
    await redis.connect();
    await seedServicesIfEmpty();
    startPoller();
    await recoverPending();
    app.listen(PORT, () => {
      logger.info(`RingSlot API on port ${PORT}`);
      startKeepAlive();
    });
  } catch (err) {
    logger.error('Boot failed', { error: err.message });
    process.exit(1);
  }
}

boot();
