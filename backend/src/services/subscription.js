/**
 * Subscription Service - Zeni
 *
 * Gerencia planos de assinatura:
 * - Free: básico
 * - Premium: features avançadas
 * - Business: white-label/API
 */

import pool from '../db/connection.js';

// Definição dos planos
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      maxTransactionsPerMonth: 50,
      maxBudgetCategories: 5,
      chatMessagesPerDay: 20,
      exportFormats: ['csv'],
      smartMemory: false,
      prioritySupport: false,
      apiAccess: false,
      customCategories: false,
      advancedReports: false,
      scheduledAlerts: false,
    }
  },
  premium: {
    name: 'Premium',
    price: 29.90,
    features: {
      maxTransactionsPerMonth: Infinity,
      maxBudgetCategories: Infinity,
      chatMessagesPerDay: Infinity,
      exportFormats: ['csv', 'pdf', 'xlsx'],
      smartMemory: true,
      prioritySupport: false,
      apiAccess: false,
      customCategories: true,
      advancedReports: true,
      scheduledAlerts: true,
    }
  },
  business: {
    name: 'Business',
    price: 99.90,
    features: {
      maxTransactionsPerMonth: Infinity,
      maxBudgetCategories: Infinity,
      chatMessagesPerDay: Infinity,
      exportFormats: ['csv', 'pdf', 'xlsx', 'json'],
      smartMemory: true,
      prioritySupport: true,
      apiAccess: true,
      customCategories: true,
      advancedReports: true,
      scheduledAlerts: true,
      whiteLabel: true,
    }
  }
};

/**
 * Busca o plano atual do usuário
 * Usa transação atômica para evitar race condition no downgrade
 */
export async function getUserSubscription(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // SELECT FOR UPDATE previne race conditions
    const result = await client.query(`
      SELECT subscription_tier, subscription_expires_at
      FROM users
      WHERE id = $1
      FOR UPDATE
    `, [userId]);

    const user = result.rows[0];
    if (!user) {
      await client.query('COMMIT');
      return null;
    }

    const tier = user.subscription_tier || 'free';
    const expiresAt = user.subscription_expires_at;

    // Verificar se expirou
    if (expiresAt && new Date(expiresAt) < new Date()) {
      // Expirou - fazer downgrade para free (atomicamente)
      await client.query(`
        UPDATE users
        SET subscription_tier = 'free', subscription_expires_at = NULL
        WHERE id = $1
      `, [userId]);
      await client.query('COMMIT');
      return { tier: 'free', plan: PLANS.free, expired: true };
    }

    await client.query('COMMIT');
    return {
      tier,
      plan: PLANS[tier] || PLANS.free,
      expiresAt,
      expired: false
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verifica se usuário pode usar uma feature
 */
export async function canUseFeature(userId, featureName) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return subscription.plan.features[featureName] === true ||
         subscription.plan.features[featureName] === Infinity;
}

/**
 * Verifica limite numérico
 */
export async function checkLimit(userId, limitName, currentCount) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return { allowed: false, limit: 0 };

  const limit = subscription.plan.features[limitName];
  const allowed = limit === Infinity || currentCount < limit;

  return {
    allowed,
    limit: limit === Infinity ? 'unlimited' : limit,
    current: currentCount,
    remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - currentCount)
  };
}

/**
 * Conta transações do mês atual
 */
export async function getMonthlyTransactionCount(userId) {
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE user_id = $1
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  `, [userId]);

  return parseInt(result.rows[0].count);
}

/**
 * Conta mensagens de chat do dia
 */
export async function getDailyChatCount(userId) {
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM chat_history
    WHERE user_id = $1
      AND role = 'user'
      AND DATE(created_at) = CURRENT_DATE
  `, [userId]);

  return parseInt(result.rows[0].count);
}

/**
 * Atualiza subscription do usuário
 */
export async function updateSubscription(userId, tier, durationDays = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  await pool.query(`
    UPDATE users
    SET subscription_tier = $2, subscription_expires_at = $3
    WHERE id = $1
  `, [userId, tier, expiresAt]);

  return { tier, expiresAt };
}

/**
 * Middleware para verificar feature
 */
export function requireFeature(featureName) {
  return async (req, res, next) => {
    const canUse = await canUseFeature(req.userId, featureName);
    if (!canUse) {
      return res.status(403).json({
        error: 'Feature não disponível no seu plano',
        feature: featureName,
        upgrade: 'Faça upgrade para Premium para acessar esta feature'
      });
    }
    next();
  };
}

/**
 * Middleware para verificar limite
 */
export function requireLimit(limitName, countFn) {
  return async (req, res, next) => {
    const currentCount = await countFn(req.userId);
    const limitCheck = await checkLimit(req.userId, limitName, currentCount);

    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Limite atingido',
        limit: limitCheck.limit,
        current: limitCheck.current,
        upgrade: 'Faça upgrade para Premium para limites ilimitados'
      });
    }

    req.subscriptionLimit = limitCheck;
    next();
  };
}

export default {
  PLANS,
  getUserSubscription,
  canUseFeature,
  checkLimit,
  getMonthlyTransactionCount,
  getDailyChatCount,
  updateSubscription,
  requireFeature,
  requireLimit
};
