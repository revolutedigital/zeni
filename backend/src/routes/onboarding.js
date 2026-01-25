/**
 * Onboarding Routes - Zeni
 *
 * Wizard de configuração inicial para novos usuários
 * Abordagem: Híbrido Adaptativo
 */

import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { callClaude } from '../services/claude.js';
import { logger } from '../services/logger.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /onboarding/status
 * Verifica se usuário completou onboarding
 */
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT onboarding_completed, onboarding_profile, monthly_income
      FROM users
      WHERE id = $1
    `, [req.userId]);

    const user = result.rows[0];

    res.json({
      completed: user?.onboarding_completed || false,
      profile: user?.onboarding_profile || null,
      monthlyIncome: user?.monthly_income ? parseFloat(user.monthly_income) : null
    });
  } catch (error) {
    logger.error('[Onboarding] Status error:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

/**
 * POST /onboarding/step/1
 * Passo 1: Qual seu momento financeiro?
 */
router.post('/step/1', async (req, res) => {
  try {
    const { moment } = req.body; // 'starting', 'optimizing', 'goal_focused'

    if (!['starting', 'optimizing', 'goal_focused'].includes(moment)) {
      return res.status(400).json({ error: 'Momento inválido' });
    }

    await pool.query(`
      UPDATE users
      SET onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || $2::jsonb
      WHERE id = $1
    `, [req.userId, JSON.stringify({ moment, step: 1 })]);

    res.json({ success: true, nextStep: 2 });
  } catch (error) {
    logger.error('[Onboarding] Step 1 error:', error);
    res.status(500).json({ error: 'Erro ao salvar passo 1' });
  }
});

/**
 * POST /onboarding/step/2
 * Passo 2: Renda e gastos fixos
 */
router.post('/step/2', async (req, res) => {
  try {
    const { monthlyIncome, fixedExpenses } = req.body;

    // fixedExpenses: { housing, transport, health, education, debts }

    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ error: 'Renda mensal inválida' });
    }

    const totalFixed = Object.values(fixedExpenses || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const availableForVariable = monthlyIncome - totalFixed;

    await pool.query(`
      UPDATE users
      SET
        monthly_income = $2,
        onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || $3::jsonb
      WHERE id = $1
    `, [
      req.userId,
      monthlyIncome,
      JSON.stringify({
        step: 2,
        fixedExpenses,
        totalFixed,
        availableForVariable
      })
    ]);

    res.json({
      success: true,
      nextStep: 3,
      summary: {
        monthlyIncome,
        totalFixed,
        availableForVariable
      }
    });
  } catch (error) {
    logger.error('[Onboarding] Step 2 error:', error);
    res.status(500).json({ error: 'Erro ao salvar passo 2' });
  }
});

/**
 * POST /onboarding/step/3
 * Passo 3: Prioridades financeiras
 */
router.post('/step/3', async (req, res) => {
  try {
    const { priorities } = req.body;

    // priorities: ['security', 'achievements', 'growth', 'quality_of_life'] em ordem

    if (!Array.isArray(priorities) || priorities.length === 0) {
      return res.status(400).json({ error: 'Prioridades inválidas' });
    }

    await pool.query(`
      UPDATE users
      SET onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || $2::jsonb
      WHERE id = $1
    `, [req.userId, JSON.stringify({ step: 3, priorities })]);

    res.json({ success: true, nextStep: 4 });
  } catch (error) {
    logger.error('[Onboarding] Step 3 error:', error);
    res.status(500).json({ error: 'Erro ao salvar passo 3' });
  }
});

/**
 * GET /onboarding/suggested-budgets
 * Gera sugestão de orçamento baseado nos passos anteriores
 */
router.get('/suggested-budgets', async (req, res) => {
  try {
    // Buscar perfil do usuário
    const userResult = await pool.query(`
      SELECT monthly_income, onboarding_profile
      FROM users
      WHERE id = $1
    `, [req.userId]);

    const user = userResult.rows[0];
    if (!user || !user.monthly_income) {
      return res.status(400).json({ error: 'Complete os passos anteriores' });
    }

    const profile = user.onboarding_profile || {};
    const income = parseFloat(user.monthly_income);
    const available = profile.availableForVariable || income * 0.4;
    const priorities = profile.priorities || ['security', 'quality_of_life', 'achievements', 'growth'];

    // Buscar categorias disponíveis
    const categoriesResult = await pool.query(`
      SELECT id, name, type FROM categories WHERE type IN ('expense', 'both')
    `);
    const categories = categoriesResult.rows;

    // Gerar sugestões baseadas nas prioridades
    const suggestions = generateBudgetSuggestions(available, priorities, categories);

    res.json({
      availableForVariable: available,
      suggestions,
      totalSuggested: suggestions.reduce((sum, s) => sum + s.amount, 0)
    });
  } catch (error) {
    logger.error('[Onboarding] Suggested budgets error:', error);
    res.status(500).json({ error: 'Erro ao gerar sugestões' });
  }
});

/**
 * POST /onboarding/step/4
 * Passo 4: Confirma/ajusta orçamentos
 */
router.post('/step/4', async (req, res) => {
  try {
    const { budgets } = req.body;

    // budgets: [{ categoryId, amount }]

    if (!Array.isArray(budgets) || budgets.length === 0) {
      return res.status(400).json({ error: 'Orçamentos inválidos' });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Criar orçamentos
    for (const budget of budgets) {
      if (budget.amount > 0) {
        await pool.query(`
          INSERT INTO budgets (user_id, category_id, amount, month, year)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, category_id, month, year)
          DO UPDATE SET amount = EXCLUDED.amount
        `, [req.userId, budget.categoryId, budget.amount, month, year]);
      }
    }

    await pool.query(`
      UPDATE users
      SET onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || $2::jsonb
      WHERE id = $1
    `, [req.userId, JSON.stringify({ step: 4, budgetsCreated: budgets.length })]);

    res.json({ success: true, nextStep: 5, budgetsCreated: budgets.length });
  } catch (error) {
    logger.error('[Onboarding] Step 4 error:', error);
    res.status(500).json({ error: 'Erro ao salvar orçamentos' });
  }
});

/**
 * POST /onboarding/step/5
 * Passo 5: Criar objetivo (opcional) ou finalizar
 */
router.post('/step/5', async (req, res) => {
  try {
    const { createGoal, goal } = req.body;

    if (createGoal && goal) {
      // Criar objetivo inicial
      await pool.query(`
        INSERT INTO goals (user_id, name, target_amount, deadline, priority, category)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        req.userId,
        goal.name,
        goal.targetAmount,
        goal.deadline || null,
        goal.priority || 'medium',
        goal.category || 'savings'
      ]);
    }

    res.json({ success: true, nextStep: 'complete' });
  } catch (error) {
    logger.error('[Onboarding] Step 5 error:', error);
    res.status(500).json({ error: 'Erro ao salvar passo 5' });
  }
});

/**
 * POST /onboarding/complete
 * Finaliza onboarding
 */
router.post('/complete', async (req, res) => {
  try {
    await pool.query(`
      UPDATE users
      SET
        onboarding_completed = true,
        onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || '{"completedAt": "${new Date().toISOString()}"}'::jsonb
      WHERE id = $1
    `, [req.userId]);

    res.json({
      success: true,
      message: 'Onboarding concluído! Bem-vindo ao Zeni!'
    });
  } catch (error) {
    logger.error('[Onboarding] Complete error:', error);
    res.status(500).json({ error: 'Erro ao finalizar onboarding' });
  }
});

/**
 * POST /onboarding/skip
 * Pula onboarding (para usuários existentes)
 */
router.post('/skip', async (req, res) => {
  try {
    await pool.query(`
      UPDATE users
      SET
        onboarding_completed = true,
        onboarding_profile = '{"skipped": true}'::jsonb
      WHERE id = $1
    `, [req.userId]);

    res.json({ success: true });
  } catch (error) {
    logger.error('[Onboarding] Skip error:', error);
    res.status(500).json({ error: 'Erro ao pular onboarding' });
  }
});

/**
 * Gera sugestões de orçamento baseado em prioridades
 */
function generateBudgetSuggestions(available, priorities, categories) {
  // Mapeamento de categorias por prioridade
  const priorityCategories = {
    security: ['Casa', 'Saúde', 'Financiamento'],
    achievements: ['Investimento', 'Carro', 'Educação'],
    growth: ['Educação', 'Investimento'],
    quality_of_life: ['Restaurante', 'Lazer/Passeio', 'Vestuário', 'Mercado']
  };

  // Percentuais base por categoria
  const basePercentages = {
    'Mercado': 0.25,
    'Restaurante': 0.12,
    'Casa': 0.10,
    'Carro': 0.10,
    'Saúde': 0.08,
    'Lazer/Passeio': 0.10,
    'Vestuário': 0.05,
    'Educação': 0.05,
    'Investimento': 0.10,
    'Outros': 0.05
  };

  // Ajustar percentuais baseado em prioridades
  const adjustedPercentages = { ...basePercentages };

  priorities.forEach((priority, index) => {
    const boost = (4 - index) * 0.02; // Primeira prioridade ganha +6%, segunda +4%, etc
    const cats = priorityCategories[priority] || [];
    cats.forEach(cat => {
      if (adjustedPercentages[cat]) {
        adjustedPercentages[cat] += boost;
      }
    });
  });

  // Normalizar para somar 100%
  const total = Object.values(adjustedPercentages).reduce((sum, v) => sum + v, 0);
  Object.keys(adjustedPercentages).forEach(key => {
    adjustedPercentages[key] = adjustedPercentages[key] / total;
  });

  // Gerar sugestões
  const suggestions = [];

  for (const category of categories) {
    const percentage = adjustedPercentages[category.name] || 0.05;
    const amount = Math.round(available * percentage / 10) * 10; // Arredondar para dezena

    if (amount >= 50) { // Mínimo R$50
      suggestions.push({
        categoryId: category.id,
        categoryName: category.name,
        amount,
        percentage: Math.round(percentage * 100)
      });
    }
  }

  // Ordenar por valor decrescente
  suggestions.sort((a, b) => b.amount - a.amount);

  return suggestions;
}

export default router;
