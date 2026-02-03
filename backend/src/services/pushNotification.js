/**
 * Push Notification Service - Zeni
 *
 * Gerencia Web Push notifications para:
 * - Alertas de orçamento
 * - Lembretes de contas
 * - Insights proativos
 */

import webpush from 'web-push';
import pool from '../db/connection.js';
import { logger } from './logger.js';

// VAPID keys - OBRIGATÓRIO definir via variáveis de ambiente
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Flag para indicar se push notifications estão habilitadas
let pushEnabled = false;

// Configurar webpush apenas se as keys estiverem definidas
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@zeni.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  pushEnabled = true;
  logger.info('Push notifications enabled');
} else {
  logger.warn('VAPID keys not configured - push notifications disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
}

/**
 * Salva subscription de push do usuário
 */
export async function saveSubscription(userId, subscription) {
  if (!pushEnabled) {
    logger.debug({ userId }, 'Push disabled - skipping subscription save');
    return false;
  }

  try {
    await pool.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, keys)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, endpoint)
      DO UPDATE SET keys = $3
    `, [userId, subscription.endpoint, JSON.stringify(subscription.keys)]);

    return true;
  } catch (error) {
    logger.error({ error, userId }, 'Error saving push subscription');
    return false;
  }
}

/**
 * Remove subscription
 */
export async function removeSubscription(userId, endpoint) {
  try {
    await pool.query(`
      DELETE FROM push_subscriptions
      WHERE user_id = $1 AND endpoint = $2
    `, [userId, endpoint]);

    return true;
  } catch (error) {
    logger.error({ error, userId, endpoint }, 'Error removing push subscription');
    return false;
  }
}

/**
 * Busca subscriptions do usuário
 */
export async function getUserSubscriptions(userId) {
  const result = await pool.query(`
    SELECT endpoint, keys FROM push_subscriptions WHERE user_id = $1
  `, [userId]);

  return result.rows.map(row => {
    let keys = row.keys;
    if (typeof keys === 'string') {
      try { keys = JSON.parse(keys); } catch { keys = {}; }
    }
    return { endpoint: row.endpoint, keys };
  });
}

/**
 * Envia notificação para um usuário
 */
export async function sendNotification(userId, notification) {
  if (!pushEnabled) {
    logger.debug({ userId }, 'Push disabled - skipping notification');
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await getUserSubscriptions(userId);

  if (subscriptions.length === 0) {
    logger.debug({ userId }, 'No push subscriptions for user');
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title || 'Zeni',
    body: notification.body,
    icon: notification.icon || '/zeni-icon-192.png',
    badge: notification.badge || '/zeni-badge.png',
    data: notification.data || {},
    actions: notification.actions || [],
    tag: notification.tag || 'zeni-notification',
    requireInteraction: notification.requireInteraction || false
  });

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (error) {
      logger.error({ error: error.statusCode, userId }, 'Push send error');
      failed++;

      // Se subscription inválida, remover
      if (error.statusCode === 410 || error.statusCode === 404) {
        await removeSubscription(userId, subscription.endpoint);
      }
    }
  }

  return { sent, failed };
}

/**
 * Envia notificação para múltiplos usuários
 * Usa Promise.allSettled para não falhar se uma notificação individual falhar
 */
export async function sendBulkNotification(userIds, notification) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendNotification(userId, notification))
  );

  let totalSent = 0;
  let totalFailed = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      totalSent += result.value.sent || 0;
      totalFailed += result.value.failed || 0;
    } else {
      totalFailed++;
    }
  }

  return { totalSent, totalFailed };
}

/**
 * Notificações predefinidas
 */
export const notifications = {
  budgetAlert: (category, percentUsed) => ({
    title: '⚠️ Alerta de Orçamento',
    body: `${category} está em ${percentUsed}% do orçamento`,
    tag: 'budget-alert',
    data: { type: 'budget_alert', category }
  }),

  budgetExceeded: (category, over) => ({
    title: '🚨 Orçamento Estourado',
    body: `${category} passou R$${over.toFixed(2)} do limite`,
    tag: 'budget-exceeded',
    requireInteraction: true,
    data: { type: 'budget_exceeded', category }
  }),

  billReminder: (description, amount, dueDate) => ({
    title: '📅 Lembrete de Conta',
    body: `${description}: R$${amount.toFixed(2)} vence ${dueDate}`,
    tag: 'bill-reminder',
    actions: [
      { action: 'pay', title: 'Marcar como paga' },
      { action: 'snooze', title: 'Lembrar depois' }
    ],
    data: { type: 'bill_reminder', description, amount }
  }),

  weeklyInsight: (savings, topCategory) => ({
    title: '📊 Resumo da Semana',
    body: `Você economizou R$${savings.toFixed(2)}! Maior gasto: ${topCategory}`,
    tag: 'weekly-insight',
    data: { type: 'weekly_insight' }
  }),

  goalProgress: (goalName, progress) => ({
    title: '🎯 Progresso da Meta',
    body: `${goalName}: ${progress}% alcançado!`,
    tag: 'goal-progress',
    data: { type: 'goal_progress', goalName }
  }),

  transactionRecorded: (amount, category) => ({
    title: '✅ Gasto Registrado',
    body: `R$${amount.toFixed(2)} em ${category}`,
    tag: 'transaction-recorded',
    data: { type: 'transaction_recorded' }
  })
};

/**
 * Retorna a public key para o frontend
 */
export function getVapidPublicKey() {
  return pushEnabled ? VAPID_PUBLIC_KEY : null;
}

/**
 * Verifica se push notifications estão habilitadas
 */
export function isPushEnabled() {
  return pushEnabled;
}

export default {
  saveSubscription,
  removeSubscription,
  getUserSubscriptions,
  sendNotification,
  sendBulkNotification,
  notifications,
  getVapidPublicKey,
  isPushEnabled
};
