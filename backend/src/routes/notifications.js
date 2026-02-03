/**
 * Notifications Routes - Zeni
 *
 * Rotas para gerenciar push notifications
 */

import { Router } from 'express';
import { authMiddleware } from './auth.js';
import {
  saveSubscription,
  removeSubscription,
  sendNotification,
  getVapidPublicKey,
  notifications
} from '../services/pushNotification.js';
import { logger } from '../services/logger.js';

const router = Router();

/**
 * GET /notifications/vapid-key
 * Retorna a public key VAPID para o frontend
 */
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Rotas autenticadas
router.use(authMiddleware);

/**
 * POST /notifications/subscribe
 * Registra subscription de push
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }

    const saved = await saveSubscription(req.userId, subscription);

    if (saved) {
      // Enviar notificação de boas-vindas (não bloqueia resposta)
      sendNotification(req.userId, {
        title: '🎉 Notificações Ativadas!',
        body: 'Você receberá alertas de orçamento e lembretes de contas.',
        tag: 'welcome'
      }).catch(err => logger.warn('[Notifications] Welcome notification failed:', err.message));

      res.json({ success: true, message: 'Push notifications ativadas!' });
    } else {
      res.status(500).json({ error: 'Erro ao salvar subscription' });
    }
  } catch (error) {
    logger.error('[Notifications] Subscribe error:', error);
    res.status(500).json({ error: 'Erro ao ativar notificações' });
  }
});

/**
 * DELETE /notifications/unsubscribe
 * Remove subscription de push
 */
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint não informado' });
    }

    await removeSubscription(req.userId, endpoint);
    res.json({ success: true, message: 'Notificações desativadas' });
  } catch (error) {
    logger.error('[Notifications] Unsubscribe error:', error);
    res.status(500).json({ error: 'Erro ao desativar notificações' });
  }
});

/**
 * POST /notifications/test
 * Envia notificação de teste
 */
router.post('/test', async (req, res) => {
  try {
    const result = await sendNotification(req.userId, {
      title: '🧪 Teste de Notificação',
      body: 'Se você está vendo isso, as notificações estão funcionando!',
      tag: 'test'
    });

    res.json({
      success: result.sent > 0,
      ...result
    });
  } catch (error) {
    logger.error('[Notifications] Test error:', error);
    res.status(500).json({ error: 'Erro ao enviar teste' });
  }
});

/**
 * GET /notifications/settings
 * Retorna configurações de notificação do usuário
 */
router.get('/settings', async (req, res) => {
  try {
    // Por enquanto, retorna defaults
    // Em produção, buscar do banco
    res.json({
      budgetAlerts: true,
      billReminders: true,
      weeklyInsights: true,
      goalProgress: true,
      transactionConfirmations: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

/**
 * PUT /notifications/settings
 * Atualiza configurações de notificação
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    // Em produção, salvar no banco
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

export default router;
