import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../services/logger.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL em produção: rejectUnauthorized deve ser true para segurança
  // Use false apenas se o provedor de DB não fornecer certificado válido
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false
});

// Testar conexão
pool.on('connect', () => {
  logger.info('PostgreSQL connected');
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL error');
});

export default pool;
