/**
 * Migração: Onboarding e Sistema de Objetivos
 *
 * Execute: node scripts/migrate-goals.js
 */

import pool from '../src/db/connection.js';

async function migrate() {
  console.log('🔄 Criando tabelas de Onboarding e Goals...');

  try {
    // Campos de onboarding em users
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS onboarding_profile JSONB,
      ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(12,2);
    `);
    console.log('✅ Campos de onboarding adicionados em users');

    // Tabela de objetivos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        target_amount DECIMAL(12,2) NOT NULL,
        current_amount DECIMAL(12,2) DEFAULT 0,
        deadline DATE,
        priority VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        action_plan JSONB,
        viability_score INTEGER,
        monthly_contribution DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela goals criada');

    // Contribuições para objetivos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goal_contributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        source VARCHAR(50) DEFAULT 'manual',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela goal_contributions criada');

    // Índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_user_status
      ON goals(user_id, status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_deadline
      ON goals(deadline)
      WHERE status = 'active';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal
      ON goal_contributions(goal_id, date DESC);
    `);
    console.log('✅ Índices criados');

    // Trigger para atualizar current_amount quando adiciona contribuição
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_goal_current_amount()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE goals
        SET current_amount = (
          SELECT COALESCE(SUM(amount), 0)
          FROM goal_contributions
          WHERE goal_id = NEW.goal_id
        ),
        updated_at = NOW()
        WHERE id = NEW.goal_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
      CREATE TRIGGER trigger_update_goal_amount
      AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
      FOR EACH ROW
      EXECUTE FUNCTION update_goal_current_amount();
    `);
    console.log('✅ Trigger de atualização criado');

    console.log('\n✅ Migração de Onboarding e Goals concluída!');
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
