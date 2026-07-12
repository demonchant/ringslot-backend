import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { globalLimiter, blockIpMiddleware } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import healthRoutes from './routes/health.js';
import logger from './utils/logger.js';
import pool from './config/database.js';
import redis from './config/redis.js';
import { startPoller, recoverPending } from './services/otpPoller.js';
import { seedServicesIfEmpty } from './services/seedServices.js';
import { startBackgroundJobs, stopBackgroundJobs } from './services/backgroundJobs.js';
import { startProviderMonitor, stopProviderMonitor } from './services/providerMonitor.js';
import { startPriceMonitor, stopPriceMonitor } from './services/priceMonitor.js';

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

// Request ID and timing — before all routes
app.use(requestId);

app.use(globalLimiter);
app.use(blockIpMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health checks (no auth required)
app.use('/api', healthRoutes);

// Legacy simple health endpoint
app.get('/health', (_req, res) => res.json({ status:'ok', ts: new Date().toISOString() }));

// Application routes
app.use('/api', routes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error:'Not found' }));

// Centralized error handler — must be last
app.use(errorHandler);

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

let server;

async function boot() {
  try {
    await pool.query('SELECT 1');
    logger.info('PostgreSQL connected');
    await redis.connect();
    await seedServicesIfEmpty();
    startPoller();
    await recoverPending();
    startBackgroundJobs();
    startProviderMonitor();
    startPriceMonitor();

    server = app.listen(PORT, () => {
      logger.info(`RingSlot API on port ${PORT}`, {
        port: PORT,
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'development',
      });
      startKeepAlive();
    });
  } catch (err) {
    logger.error('Boot failed', { error: err.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown — close connections cleanly on SIGTERM/SIGINT
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  stopBackgroundJobs();
  stopProviderMonitor();
  stopPriceMonitor();

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    await pool.end();
    logger.info('PostgreSQL pool closed');
  } catch (err) {
    logger.error('Error closing PostgreSQL pool', { error: err.message });
  }

  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (err) {
    logger.error('Error closing Redis', { error: err.message });
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

boot();
