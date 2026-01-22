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

// Configurar VAPID keys (gerar novas em produção)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls';

// Configurar webpush
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@zeni.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * Salva subscription de push do usuário
 */
export async function saveSubscription(userId, subscription) {
  try {
    await pool.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, keys)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, endpoint)
      DO UPDATE SET keys = $3
    `, [userId, subscription.endpoint, JSON.stringify(subscription.keys)]);

    return true;
  } catch (error) {
    console.error('[Push] Error saving subscription:', error);
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
    console.error('[Push] Error removing subscription:', error);
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

  return result.rows.map(row => ({
    endpoint: row.endpoint,
    keys: typeof row.keys === 'string' ? JSON.parse(row.keys) : row.keys
  }));
}

/**
 * Envia notificação para um usuário
 */
export async function sendNotification(userId, notification) {
  const subscriptions = await getUserSubscriptions(userId);

  if (subscriptions.length === 0) {
    console.log('[Push] No subscriptions for user:', userId);
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
      console.error('[Push] Send error:', error.statusCode);
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
 */
export async function sendBulkNotification(userIds, notification) {
  const results = await Promise.all(
    userIds.map(userId => sendNotification(userId, notification))
  );

  return {
    totalSent: results.reduce((sum, r) => sum + r.sent, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0)
  };
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
  return VAPID_PUBLIC_KEY;
}

export default {
  saveSubscription,
  removeSubscription,
  getUserSubscriptions,
  sendNotification,
  sendBulkNotification,
  notifications,
  getVapidPublicKey
};
