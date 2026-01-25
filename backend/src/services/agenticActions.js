/**
 * Agentic Actions Service - Zeni
 *
 * Sistema de ações autônomas que:
 * 1. Agenda lembretes de contas pendentes
 * 2. Envia alertas proativos de orçamento
 * 3. Gera insights semanais automaticamente
 * 4. Executa ações agendadas pelo CFO
 */

import pool from '../db/connection.js';
import { sendNotification, notifications } from './pushNotification.js';
import { callClaude } from './claude.js';
import { logger } from './logger.js';

/**
 * Agenda uma ação para execução futura
 */
export async function scheduleAction(userId, actionType, actionData, scheduledFor) {
  const result = await pool.query(`
    INSERT INTO scheduled_actions (user_id, action_type, action_data, scheduled_for)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [userId, actionType, JSON.stringify(actionData), scheduledFor]);

  return result.rows[0].id;
}

/**
 * Busca ações pendentes para execução
 */
export async function getPendingActions() {
  const result = await pool.query(`
    SELECT id, user_id, action_type, action_data, scheduled_for
    FROM scheduled_actions
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
    ORDER BY scheduled_for ASC
    LIMIT 100
  `);

  return result.rows.map(row => ({
    ...row,
    action_data: typeof row.action_data === 'string'
      ? JSON.parse(row.action_data)
      : row.action_data
  }));
}

/**
 * Marca ação como executada
 */
export async function completeAction(actionId, result = {}) {
  await pool.query(`
    UPDATE scheduled_actions
    SET status = 'completed', executed_at = NOW(), result = $2
    WHERE id = $1
  `, [actionId, JSON.stringify(result)]);
}

/**
 * Marca ação como falha
 */
export async function failAction(actionId, error) {
  await pool.query(`
    UPDATE scheduled_actions
    SET status = 'failed', result = $2
    WHERE id = $1
  `, [actionId, JSON.stringify({ error: error.message || error })]);
}

/**
 * Executa uma ação
 */
export async function executeAction(action) {
  logger.debug(`[Agentic] Executing action ${action.action_type} for user ${action.user_id}`);

  try {
    switch (action.action_type) {
      case 'bill_reminder':
        await executeBillReminder(action);
        break;

      case 'budget_alert':
        await executeBudgetAlert(action);
        break;

      case 'weekly_insight':
        await executeWeeklyInsight(action);
        break;

      case 'proactive_tip':
        await executeProactiveTip(action);
        break;

      default:
        logger.warn(`[Agentic] Unknown action type: ${action.action_type}`);
    }

    await completeAction(action.id, { success: true });
  } catch (error) {
    logger.error(`[Agentic] Action ${action.id} failed:`, error);
    await failAction(action.id, error);
  }
}

/**
 * Executa lembrete de conta
 */
async function executeBillReminder(action) {
  const { description, amount, dueDate } = action.action_data;

  await sendNotification(
    action.user_id,
    notifications.billReminder(description, amount, dueDate)
  );
}

/**
 * Executa alerta de orçamento
 */
async function executeBudgetAlert(action) {
  const { category, percentUsed, isExceeded, overAmount } = action.action_data;

  if (isExceeded) {
    await sendNotification(
      action.user_id,
      notifications.budgetExceeded(category, overAmount)
    );
  } else {
    await sendNotification(
      action.user_id,
      notifications.budgetAlert(category, percentUsed)
    );
  }
}

/**
 * Gera e envia insight semanal
 */
async function executeWeeklyInsight(action) {
  const userId = action.user_id;

  // Buscar dados da semana
  const weekData = await pool.query(`
    SELECT
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income
    FROM transactions
    WHERE user_id = $1
      AND created_at >= NOW() - INTERVAL '7 days'
  `, [userId]);

  // Buscar categoria com mais gastos
  const topCategory = await pool.query(`
    SELECT c.name, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
      AND t.type = 'expense'
      AND t.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY c.name
    ORDER BY total DESC
    LIMIT 1
  `, [userId]);

  const expenses = parseFloat(weekData.rows[0]?.total_expenses || 0);
  const income = parseFloat(weekData.rows[0]?.total_income || 0);
  const savings = income - expenses;
  const category = topCategory.rows[0]?.name || 'N/A';

  await sendNotification(
    userId,
    notifications.weeklyInsight(savings, category)
  );
}

/**
 * Gera dica proativa usando IA
 */
async function executeProactiveTip(action) {
  const userId = action.user_id;

  // Buscar contexto do usuário
  const context = await pool.query(`
    SELECT
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE user_id = $1
      AND created_at >= NOW() - INTERVAL '30 days'
  `, [userId]);

  const expenses = parseFloat(context.rows[0]?.expenses || 0);

  // Gerar dica com IA
  const tip = await callClaude(
    'Você é um CFO pessoal. Gere uma dica financeira curta (máx 100 chars) para alguém que gastou R$' + expenses.toFixed(2) + ' este mês.',
    'Gere uma dica prática e acionável.',
    'claude-3-haiku-20240307'
  );

  await sendNotification(userId, {
    title: '💡 Dica Financeira',
    body: tip.substring(0, 100),
    tag: 'proactive-tip'
  });
}

/**
 * Verifica e agenda alertas de orçamento para um usuário
 */
export async function checkAndScheduleBudgetAlerts(userId) {
  // Buscar orçamentos com alto uso
  const result = await pool.query(`
    SELECT
      c.name as category,
      b.amount as budget,
      COALESCE(SUM(t.amount), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.user_id = b.user_id
      AND t.type = 'expense'
      AND EXTRACT(MONTH FROM t.date) = b.month
      AND EXTRACT(YEAR FROM t.date) = b.year
    WHERE b.user_id = $1
      AND b.month = EXTRACT(MONTH FROM NOW())
      AND b.year = EXTRACT(YEAR FROM NOW())
    GROUP BY c.name, b.amount
    HAVING COALESCE(SUM(t.amount), 0) > b.amount * 0.8
  `, [userId]);

  for (const row of result.rows) {
    const spent = parseFloat(row.spent);
    const budget = parseFloat(row.budget);
    const percentUsed = Math.round((spent / budget) * 100);
    const isExceeded = spent > budget;

    // Verificar se já não tem alerta recente
    const existing = await pool.query(`
      SELECT id FROM scheduled_actions
      WHERE user_id = $1
        AND action_type = 'budget_alert'
        AND action_data->>'category' = $2
        AND created_at >= NOW() - INTERVAL '24 hours'
    `, [userId, row.category]);

    if (existing.rows.length === 0) {
      await scheduleAction(userId, 'budget_alert', {
        category: row.category,
        percentUsed,
        isExceeded,
        overAmount: isExceeded ? spent - budget : 0
      }, new Date());
    }
  }
}

/**
 * Verifica e agenda lembretes de contas pendentes
 */
export async function checkAndScheduleBillReminders(userId) {
  // Buscar transações pendentes (paid = false) com data próxima
  const result = await pool.query(`
    SELECT id, description, amount, date
    FROM transactions
    WHERE user_id = $1
      AND paid = false
      AND date <= NOW() + INTERVAL '3 days'
      AND date >= NOW() - INTERVAL '1 day'
  `, [userId]);

  for (const row of result.rows) {
    // Verificar se já não tem lembrete
    const existing = await pool.query(`
      SELECT id FROM scheduled_actions
      WHERE user_id = $1
        AND action_type = 'bill_reminder'
        AND action_data->>'transactionId' = $2
        AND created_at >= NOW() - INTERVAL '24 hours'
    `, [userId, row.id]);

    if (existing.rows.length === 0) {
      const dueDate = new Date(row.date).toLocaleDateString('pt-BR');

      await scheduleAction(userId, 'bill_reminder', {
        transactionId: row.id,
        description: row.description || 'Conta pendente',
        amount: parseFloat(row.amount),
        dueDate
      }, new Date());
    }
  }
}

/**
 * Agenda insight semanal para todos os usuários ativos
 */
export async function scheduleWeeklyInsights() {
  // Buscar usuários ativos (com atividade nos últimos 7 dias)
  const result = await pool.query(`
    SELECT DISTINCT user_id
    FROM chat_history
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `);

  const nextSunday = getNextSunday();

  for (const row of result.rows) {
    // Verificar se já não tem insight agendado
    const existing = await pool.query(`
      SELECT id FROM scheduled_actions
      WHERE user_id = $1
        AND action_type = 'weekly_insight'
        AND scheduled_for >= NOW()
        AND status = 'pending'
    `, [row.user_id]);

    if (existing.rows.length === 0) {
      await scheduleAction(row.user_id, 'weekly_insight', {}, nextSunday);
    }
  }

  return result.rows.length;
}

/**
 * Worker que processa ações pendentes
 */
export async function processAgenticActions() {
  const actions = await getPendingActions();

  logger.debug(`[Agentic] Processing ${actions.length} pending actions`);

  for (const action of actions) {
    await executeAction(action);
  }

  return actions.length;
}

/**
 * Job de verificação periódica (chamar via cron ou setInterval)
 */
export async function runPeriodicChecks() {
  logger.debug('[Agentic] Running periodic checks...');

  // Buscar todos os usuários ativos
  const users = await pool.query(`
    SELECT DISTINCT user_id FROM transactions
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  for (const { user_id } of users.rows) {
    await checkAndScheduleBudgetAlerts(user_id);
    await checkAndScheduleBillReminders(user_id);
  }

  // Processar ações pendentes
  await processAgenticActions();

  logger.debug('[Agentic] Periodic checks complete');
}

// Helper
function getNextSunday() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 0, 0, 0); // 10:00 da manhã
  return nextSunday;
}

export default {
  scheduleAction,
  getPendingActions,
  executeAction,
  checkAndScheduleBudgetAlerts,
  checkAndScheduleBillReminders,
  scheduleWeeklyInsights,
  processAgenticActions,
  runPeriodicChecks
};
