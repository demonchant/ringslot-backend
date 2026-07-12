import redis from '../config/redis.js';
import logger from '../utils/logger.js';

// Circuit breaker states: CLOSED (healthy) → OPEN (broken) → HALF_OPEN (testing)
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIME_MS = 60000; // 1 minute before retrying a failed provider
const HEALTH_TTL = 300; // 5 minutes for health score cache

class ProviderHealth {
  constructor() {
    this.circuits = new Map(); // providerName → { failures, state, lastFailure, responseTimesMs[] }
  }

  getCircuit(name) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        failures: 0,
        state: 'CLOSED',
        lastFailure: 0,
        responseTimes: [],
        totalRequests: 0,
        totalFailures: 0,
      });
    }
    return this.circuits.get(name);
  }

  isAvailable(name) {
    const circuit = this.getCircuit(name);
    if (circuit.state === 'CLOSED') return true;
    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailure > RECOVERY_TIME_MS) {
        circuit.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    // HALF_OPEN — allow one test request
    return true;
  }

  recordSuccess(name, responseTimeMs) {
    const circuit = this.getCircuit(name);
    circuit.failures = 0;
    circuit.state = 'CLOSED';
    circuit.totalRequests++;
    circuit.responseTimes.push(responseTimeMs);
    if (circuit.responseTimes.length > 100) circuit.responseTimes.shift();
  }

  recordFailure(name) {
    const circuit = this.getCircuit(name);
    circuit.failures++;
    circuit.totalRequests++;
    circuit.totalFailures++;
    circuit.lastFailure = Date.now();
    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = 'OPEN';
      logger.warn(`Circuit OPEN for provider: ${name}`, { failures: circuit.failures });
    }
  }

  getScore(name) {
    const circuit = this.getCircuit(name);
    if (circuit.totalRequests === 0) return 100;
    const successRate = ((circuit.totalRequests - circuit.totalFailures) / circuit.totalRequests) * 100;
    const avgResponse = circuit.responseTimes.length
      ? circuit.responseTimes.reduce((a, b) => a + b, 0) / circuit.responseTimes.length
      : 0;
    // Penalize slow responses (over 5s gets penalty)
    const speedPenalty = Math.min(20, Math.max(0, (avgResponse - 2000) / 200));
    return Math.max(0, Math.round(successRate - speedPenalty));
  }

  getStats(name) {
    const circuit = this.getCircuit(name);
    const avgMs = circuit.responseTimes.length
      ? Math.round(circuit.responseTimes.reduce((a, b) => a + b, 0) / circuit.responseTimes.length)
      : 0;
    return {
      state: circuit.state,
      score: this.getScore(name),
      failures: circuit.failures,
      totalRequests: circuit.totalRequests,
      totalFailures: circuit.totalFailures,
      avgResponseMs: avgMs,
      isAvailable: this.isAvailable(name),
    };
  }

  getAllStats() {
    const stats = {};
    for (const [name] of this.circuits) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  async cacheStats() {
    try {
      const stats = this.getAllStats();
      await redis.setex('provider:health:all', HEALTH_TTL, JSON.stringify(stats));
    } catch {}
  }
}

export const providerHealth = new ProviderHealth();
