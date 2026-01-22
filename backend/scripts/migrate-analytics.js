/**
 * Migração: Analytics e Subscription
 *
 * Execute: node scripts/migrate-analytics.js
 */

import pool from '../src/db/connection.js';

async function migrate() {
  console.log('🔄 Criando tabelas de Analytics e Subscription...');

  try {
    // Tabela de eventos de analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela analytics_events criada');

    // Índices para analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_user_date
      ON analytics_events(user_id, created_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type
      ON analytics_events(event_type, created_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_date
      ON analytics_events(DATE(created_at));
    `);
    console.log('✅ Índices de analytics criados');

    // Adicionar campos de subscription na tabela users
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS push_subscription JSONB;
    `);
    console.log('✅ Campos de subscription adicionados em users');

    // Tabela de scheduled actions (para agentic AI)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        action_data JSONB NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        executed_at TIMESTAMP,
        result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela scheduled_actions criada');

    // Índice para scheduled actions
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_actions_pending
      ON scheduled_actions(scheduled_for, status)
      WHERE status = 'pending';
    `);
    console.log('✅ Índice de scheduled_actions criado');

    // Tabela de push subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        keys JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, endpoint)
      );
    `);
    console.log('✅ Tabela push_subscriptions criada');

    // Tabela de alertas agendados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        scheduled_for TIMESTAMP NOT NULL,
        recurring VARCHAR(20),
        last_sent_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela scheduled_alerts criada');

    console.log('\n✅ Migração de Analytics concluída!');
  } catch (error) {
    if (error.code === '42701') {
      console.log('ℹ️ Algumas colunas já existem, continuando...');
    } else if (error.code === '42P07') {
      console.log('ℹ️ Algumas tabelas já existem, continuando...');
    } else {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    }
  }

  process.exit(0);
}

migrate();
