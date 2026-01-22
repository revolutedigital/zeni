/**
 * Subscription Routes - Zeni
 *
 * Rotas para gerenciar assinaturas
 */

import { Router } from 'express';
import { authMiddleware } from './auth.js';
import {
  PLANS,
  getUserSubscription,
  updateSubscription,
  getMonthlyTransactionCount,
  getDailyChatCount,
  checkLimit
} from '../services/subscription.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /subscription
 * Retorna plano atual e limites
 */
router.get('/', async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.userId);
    const transactionCount = await getMonthlyTransactionCount(req.userId);
    const chatCount = await getDailyChatCount(req.userId);

    const transactionLimit = await checkLimit(req.userId, 'maxTransactionsPerMonth', transactionCount);
    const chatLimit = await checkLimit(req.userId, 'chatMessagesPerDay', chatCount);

    res.json({
      ...subscription,
      usage: {
        transactions: transactionLimit,
        chatMessages: chatLimit
      }
    });
  } catch (error) {
    console.error('[Subscription] Error:', error);
    res.status(500).json({ error: 'Erro ao buscar subscription' });
  }
});

/**
 * GET /subscription/plans
 * Lista todos os planos disponíveis
 */
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
    features: Object.entries(plan.features).map(([name, value]) => ({
      name,
      value,
      label: getFeatureLabel(name)
    }))
  }));

  res.json(plans);
});

/**
 * POST /subscription/upgrade
 * Simula upgrade de plano (integrar com gateway de pagamento real)
 */
router.post('/upgrade', async (req, res) => {
  try {
    const { tier } = req.body;

    if (!PLANS[tier]) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Em produção, aqui integraria com Stripe/Mercado Pago
    // Por agora, apenas simula o upgrade
    const result = await updateSubscription(req.userId, tier, 30);

    res.json({
      success: true,
      message: `Upgrade para ${PLANS[tier].name} realizado!`,
      subscription: result
    });
  } catch (error) {
    console.error('[Subscription] Upgrade error:', error);
    res.status(500).json({ error: 'Erro ao processar upgrade' });
  }
});

/**
 * POST /subscription/cancel
 * Cancela subscription (volta para free)
 */
router.post('/cancel', async (req, res) => {
  try {
    await updateSubscription(req.userId, 'free', 0);

    res.json({
      success: true,
      message: 'Subscription cancelada. Você voltou para o plano Free.'
    });
  } catch (error) {
    console.error('[Subscription] Cancel error:', error);
    res.status(500).json({ error: 'Erro ao cancelar subscription' });
  }
});

// Helper para labels de features
function getFeatureLabel(name) {
  const labels = {
    maxTransactionsPerMonth: 'Transações por mês',
    maxBudgetCategories: 'Categorias de orçamento',
    chatMessagesPerDay: 'Mensagens de chat por dia',
    exportFormats: 'Formatos de exportação',
    smartMemory: 'Memória inteligente',
    prioritySupport: 'Suporte prioritário',
    apiAccess: 'Acesso à API',
    customCategories: 'Categorias personalizadas',
    advancedReports: 'Relatórios avançados',
    scheduledAlerts: 'Alertas agendados',
    whiteLabel: 'White-label'
  };
  return labels[name] || name;
}

export default router;
