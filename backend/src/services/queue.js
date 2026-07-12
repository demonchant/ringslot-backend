// ============================================================
// RingSlot — Redis-Based Job Queue
// Lightweight queue with retry, dead-letter, and concurrency
// ============================================================

import { randomUUID } from 'crypto';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';

// ── Queue Key Helpers ─────────────────────────────────────────

const keys = (queueName) => ({
  pending: `queue:${queueName}:pending`,
  processing: `queue:${queueName}:processing`,
  failed: `queue:${queueName}:failed`,
  deadLetter: `queue:${queueName}:dead`,
  stats: `queue:${queueName}:stats`,
});

// ── Enqueue ─────────────────────────────────────────────────

/**
 * Push a job onto a queue.
 * @param {string} queueName - Name of the queue
 * @param {object} payload - Job payload data
 * @param {object} [options] - Options { maxAttempts, delay }
 * @returns {object} The created job
 */
export async function enqueue(queueName, payload, options = {}) {
  const { maxAttempts = 3, delay = 0 } = options;
  const k = keys(queueName);

  const job = {
    id: randomUUID(),
    queue: queueName,
    payload,
    attempts: 0,
    maxAttempts,
    createdAt: new Date().toISOString(),
    scheduledFor: delay > 0
      ? new Date(Date.now() + delay).toISOString()
      : null,
    status: 'pending',
  };

  const serialized = JSON.stringify(job);

  if (delay > 0) {
    // Delayed jobs use a sorted set scored by execution time
    await redis.zadd(`queue:${queueName}:delayed`, Date.now() + delay, serialized);
  } else {
    await redis.lpush(k.pending, serialized);
  }

  await redis.hincrby(k.stats, 'enqueued', 1);

  logger.debug('Job enqueued', { queue: queueName, jobId: job.id });
  return job;
}

// ── Dequeue ─────────────────────────────────────────────────

/**
 * Pop a job from a queue (blocking).
 * @param {string} queueName - Name of the queue
 * @param {number} [timeout=5] - BRPOP timeout in seconds (0 = block forever)
 * @returns {object|null} The job or null if timeout
 */
export async function dequeue(queueName, timeout = 5) {
  const k = keys(queueName);

  // First, promote any delayed jobs that are ready
  await promoteDelayedJobs(queueName);

  const result = await redis.brpop(k.pending, timeout);

  if (!result) return null;

  const [, serialized] = result;
  const job = JSON.parse(serialized);
  job.status = 'processing';
  job.startedAt = new Date().toISOString();

  // Track in processing set
  await redis.hset(k.processing, job.id, JSON.stringify(job));
  await redis.hincrby(k.stats, 'processing', 1);

  return job;
}

// ── Acknowledge (Complete) ──────────────────────────────────

/**
 * Mark a job as successfully completed.
 * @param {string} queueName
 * @param {string} jobId
 */
export async function acknowledge(queueName, jobId) {
  const k = keys(queueName);
  await redis.hdel(k.processing, jobId);
  await redis.hincrby(k.stats, 'completed', 1);
  await redis.hincrby(k.stats, 'processing', -1);
  logger.debug('Job completed', { queue: queueName, jobId });
}

// ── Fail / Retry ────────────────────────────────────────────

/**
 * Mark a job as failed; retry if attempts remain, else dead-letter.
 * @param {string} queueName
 * @param {object} job - The job object
 * @param {Error|string} error - The error
 */
export async function fail(queueName, job, error) {
  const k = keys(queueName);
  const errorMessage = error instanceof Error ? error.message : String(error);

  job.attempts += 1;
  job.lastError = errorMessage;
  job.lastFailedAt = new Date().toISOString();

  // Remove from processing
  await redis.hdel(k.processing, job.id);
  await redis.hincrby(k.stats, 'processing', -1);

  if (job.attempts < job.maxAttempts) {
    // Retry with exponential backoff: 2^attempts * 1000ms (2s, 4s, 8s...)
    const backoffMs = Math.pow(2, job.attempts) * 1000;
    job.status = 'retrying';
    job.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    const serialized = JSON.stringify(job);
    await redis.zadd(`queue:${queueName}:delayed`, Date.now() + backoffMs, serialized);
    await redis.hincrby(k.stats, 'retries', 1);

    logger.warn('Job failed, scheduling retry', {
      queue: queueName,
      jobId: job.id,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
      backoffMs,
      error: errorMessage,
    });
  } else {
    // Exhausted retries — move to dead letter queue
    job.status = 'dead';
    const serialized = JSON.stringify(job);
    await redis.lpush(k.deadLetter, serialized);
    await redis.hincrby(k.stats, 'dead', 1);

    logger.error('Job moved to dead letter queue', {
      queue: queueName,
      jobId: job.id,
      attempts: job.attempts,
      error: errorMessage,
    });
  }

  await redis.hincrby(k.stats, 'failed', 1);
}

// ── Worker ──────────────────────────────────────────────────

/**
 * Create a worker that continuously processes jobs from a queue.
 * @param {string} queueName - Queue to consume from
 * @param {function} handler - Async function (job) => void
 * @param {object} [options] - { concurrency, pollInterval }
 * @returns {object} Worker control object { stop(), isRunning }
 */
export function createWorker(queueName, handler, options = {}) {
  const { concurrency = 1, pollInterval = 1 } = options;
  let running = true;
  let activeJobs = 0;
  const workers = [];

  const processJob = async () => {
    while (running) {
      if (activeJobs >= concurrency) {
        await sleep(100);
        continue;
      }

      try {
        const job = await dequeue(queueName, pollInterval);

        if (!job) continue;

        activeJobs++;

        // Process in background to allow concurrency
        (async () => {
          try {
            await handler(job);
            await acknowledge(queueName, job.id);
          } catch (err) {
            await fail(queueName, job, err);
          } finally {
            activeJobs--;
          }
        })();
      } catch (err) {
        logger.error('Worker error', { queue: queueName, error: err.message });
        await sleep(1000);
      }
    }
  };

  // Start worker threads
  for (let i = 0; i < concurrency; i++) {
    workers.push(processJob());
  }

  logger.info('Worker started', { queue: queueName, concurrency });

  return {
    get isRunning() { return running; },
    get activeJobs() { return activeJobs; },
    async stop() {
      running = false;
      // Wait for in-flight jobs to finish (max 30s)
      const deadline = Date.now() + 30000;
      while (activeJobs > 0 && Date.now() < deadline) {
        await sleep(100);
      }
      logger.info('Worker stopped', { queue: queueName, activeJobs });
    },
  };
}

// ── Queue Statistics ────────────────────────────────────────

/**
 * Get statistics for a queue.
 * @param {string} queueName
 * @returns {object} Stats: pending, processing, completed, failed, dead, retries
 */
export async function getQueueStats(queueName) {
  const k = keys(queueName);

  const [pendingCount, processingCount, deadCount, statsRaw] = await Promise.all([
    redis.llen(k.pending),
    redis.hlen(k.processing),
    redis.llen(k.deadLetter),
    redis.hgetall(k.stats),
  ]);

  const delayedCount = await redis.zcard(`queue:${queueName}:delayed`);

  return {
    queue: queueName,
    pending: pendingCount,
    delayed: delayedCount,
    processing: processingCount,
    dead: deadCount,
    totals: {
      enqueued: parseInt(statsRaw?.enqueued || '0', 10),
      completed: parseInt(statsRaw?.completed || '0', 10),
      failed: parseInt(statsRaw?.failed || '0', 10),
      retries: parseInt(statsRaw?.retries || '0', 10),
    },
  };
}

// ── Dead Letter Queue Management ────────────────────────────

/**
 * Get jobs from the dead letter queue.
 * @param {string} queueName
 * @param {number} [limit=20]
 * @returns {Array} Dead-lettered jobs
 */
export async function getDeadLetterJobs(queueName, limit = 20) {
  const k = keys(queueName);
  const items = await redis.lrange(k.deadLetter, 0, limit - 1);
  return items.map(item => JSON.parse(item));
}

/**
 * Retry a dead-lettered job by moving it back to the pending queue.
 * @param {string} queueName
 * @param {string} jobId
 * @returns {boolean} Whether the job was found and re-queued
 */
export async function retryDeadJob(queueName, jobId) {
  const k = keys(queueName);
  const items = await redis.lrange(k.deadLetter, 0, -1);

  for (let i = 0; i < items.length; i++) {
    const job = JSON.parse(items[i]);
    if (job.id === jobId) {
      // Remove from dead letter
      await redis.lrem(k.deadLetter, 1, items[i]);
      // Reset and re-enqueue
      job.attempts = 0;
      job.status = 'pending';
      job.retriedAt = new Date().toISOString();
      await redis.lpush(k.pending, JSON.stringify(job));
      await redis.hincrby(k.stats, 'dead', -1);
      logger.info('Dead job retried', { queue: queueName, jobId });
      return true;
    }
  }

  return false;
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Promote delayed jobs that are ready to be processed.
 */
async function promoteDelayedJobs(queueName) {
  const delayedKey = `queue:${queueName}:delayed`;
  const k = keys(queueName);
  const now = Date.now();

  // Get jobs whose score (scheduled time) is <= now
  const ready = await redis.zrangebyscore(delayedKey, 0, now);

  if (ready.length === 0) return;

  const pipeline = redis.pipeline();
  for (const item of ready) {
    pipeline.zrem(delayedKey, item);
    pipeline.lpush(k.pending, item);
  }
  await pipeline.exec();

  if (ready.length > 0) {
    logger.debug('Promoted delayed jobs', { queue: queueName, count: ready.length });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Exports ─────────────────────────────────────────────────

export default {
  enqueue,
  dequeue,
  acknowledge,
  fail,
  createWorker,
  getQueueStats,
  getDeadLetterJobs,
  retryDeadJob,
};
