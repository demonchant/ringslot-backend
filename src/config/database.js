import pg from 'pg';
import logger from '../utils/logger.js';

const { Pool } = pg;

// Parse and fix the connection URL to force IPv4 pooler
function getConnectionConfig() {
  const url = process.env.DATABASE_URL;
  
  if (!url) throw new Error('DATABASE_URL is not set');

  // If using direct connection, switch to pooler automatically
  let connectionString = url;
  
  if (url.includes('.supabase.co') && !url.includes('pooler.supabase.com')) {
    // Extract project ref and password from direct URL
    // Format: postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co/);
    if (match) {
      const [, user, password, ref] = match;
      connectionString = `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
      logger.info('Switched to Supabase pooler URL for IPv4 compatibility');
    }
  }

  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Force IPv4
    family: 4,
  };
}

const pool = new Pool(getConnectionConfig());

pool.on('error', (err) => logger.error('DB pool error', { error: err.message }));
pool.on('connect', () => logger.info('DB client connected'));

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
