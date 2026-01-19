/**
 * Migração: Criar tabela conversation_state
 *
 * Execute: node scripts/migrate-conversation-state.js
 */

import pool from '../src/db/connection.js';

async function migrate() {
  console.log('🔄 Criando tabela conversation_state...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_state (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        state_data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_state_updated
      ON conversation_state(updated_at);
    `);

    console.log('✅ Tabela conversation_state criada com sucesso!');
  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️ Tabela já existe, ignorando...');
    } else {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    }
  }

  process.exit(0);
}

migrate();
