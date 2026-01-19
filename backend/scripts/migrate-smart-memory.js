/**
 * Migração: Criar tabelas para Smart Memory
 *
 * Execute: node scripts/migrate-smart-memory.js
 */

import pool from '../src/db/connection.js';

async function migrate() {
  console.log('🔄 Criando tabelas de Smart Memory...');

  try {
    // Tabela de resumos de conversa
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        summary TEXT NOT NULL,
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela conversation_summaries criada');

    // Tabela de fatos do usuário (long-term memory)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_facts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fact_type VARCHAR(50) NOT NULL,
        fact_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, fact_type)
      );
    `);
    console.log('✅ Tabela user_facts criada');

    // Índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_summaries_user_date
      ON conversation_summaries(user_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_facts_user
      ON user_facts(user_id);
    `);
    console.log('✅ Índices criados');

    console.log('\n✅ Migração Smart Memory concluída!');
  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️ Tabelas já existem, ignorando...');
    } else {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    }
  }

  process.exit(0);
}

migrate();
