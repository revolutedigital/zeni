import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migração...');

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schema);

    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    // Em produção, não expor stack trace completo
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Erro na migração:', error.message);
    } else {
      console.error('❌ Erro na migração:', error);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
