/**
 * Initial Schema Migration - Zeni
 *
 * Creates all database tables for the Zeni application.
 */

export async function up(knex) {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 100).notNullable();
    table.string('phone', 20);
    table.string('persona', 50);
    table.decimal('monthly_income', 12, 2);
    table.jsonb('preferences').defaultTo('{}');
    table.boolean('onboarding_completed').defaultTo(false);
    table.string('subscription_tier', 20).defaultTo('free');
    table.timestamp('subscription_expires_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Categories table
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 50).notNullable();
    table.string('color', 7).defaultTo('#4CAF50');
    table.string('icon', 50).defaultTo('📦');
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'name']);
  });

  // Transactions table
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.string('description', 255);
    table.date('date').defaultTo(knex.fn.now());
    table.string('type', 10).notNullable();
    table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
    table.string('source', 50).defaultTo('manual');
    table.jsonb('metadata');
    table.boolean('paid').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'date']);
    table.index(['user_id', 'category_id']);
    table.check('?? IN (?, ?)', ['type', 'income', 'expense']);
  });

  // Budgets table
  await knex.schema.createTable('budgets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('category_id').notNullable().references('id').inTable('categories').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.integer('month').notNullable();
    table.integer('year').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'category_id', 'month', 'year']);
    table.index(['user_id', 'month', 'year']);
  });

  // Goals table
  await knex.schema.createTable('goals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description');
    table.decimal('target_amount', 12, 2).notNullable();
    table.decimal('current_amount', 12, 2).defaultTo(0);
    table.date('deadline');
    table.string('priority', 20).defaultTo('medium');
    table.string('category', 50).defaultTo('savings');
    table.string('status', 20).defaultTo('active');
    table.integer('viability_score');
    table.decimal('monthly_contribution', 12, 2);
    table.text('action_plan');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'status']);
  });

  // Goal contributions table
  await knex.schema.createTable('goal_contributions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('goal_id').notNullable().references('id').inTable('goals').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.date('date').defaultTo(knex.fn.now());
    table.string('source', 50).defaultTo('manual');
    table.text('note');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('goal_id');
  });

  // Conversations table
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 200);
    table.jsonb('messages').defaultTo('[]');
    table.jsonb('summary');
    table.string('last_agent', 50);
    table.jsonb('state').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'updated_at']);
  });

  // Push subscriptions table
  await knex.schema.createTable('push_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('endpoint').notNullable();
    table.text('p256dh').notNullable();
    table.text('auth').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'endpoint']);
  });

  // Scheduled alerts table
  await knex.schema.createTable('scheduled_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('alert_type', 50).notNullable();
    table.string('title', 200);
    table.text('message');
    table.timestamp('scheduled_for').notNullable();
    table.string('recurring', 20);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_read').defaultTo(false);
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'is_active', 'scheduled_for']);
  });

  // Analytics events table
  await knex.schema.createTable('analytics_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('event_type', 100).notNullable();
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['event_type', 'created_at']);
  });

  // Trigger function for updating goal current_amount
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_goal_current_amount()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE goals
        SET current_amount = current_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.goal_id;
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE goals
        SET current_amount = current_amount - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.goal_id;
        RETURN OLD;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
    CREATE TRIGGER trigger_update_goal_amount
    AFTER INSERT OR DELETE ON goal_contributions
    FOR EACH ROW EXECUTE FUNCTION update_goal_current_amount();
  `);
}

export async function down(knex) {
  // Drop trigger and function
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions');
  await knex.raw('DROP FUNCTION IF EXISTS update_goal_current_amount');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('analytics_events');
  await knex.schema.dropTableIfExists('scheduled_alerts');
  await knex.schema.dropTableIfExists('push_subscriptions');
  await knex.schema.dropTableIfExists('conversations');
  await knex.schema.dropTableIfExists('goal_contributions');
  await knex.schema.dropTableIfExists('goals');
  await knex.schema.dropTableIfExists('budgets');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');
}
