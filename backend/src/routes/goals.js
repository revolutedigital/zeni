/**
 * Goals Routes - Zeni
 *
 * CRUD e análise de objetivos financeiros
 */

import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { analyzeGoalViability, refreshGoalAnalysis } from '../services/goalAnalyzer.js';
import { logger } from '../services/logger.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /goals
 * Lista todos os objetivos do usuário
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query; // 'active', 'completed', 'all'

    let query = `
      SELECT
        g.*,
        COALESCE(
          (SELECT SUM(amount) FROM goal_contributions WHERE goal_id = g.id),
          0
        ) as total_contributed,
        CASE
          WHEN g.target_amount > 0
          THEN ROUND((g.current_amount / g.target_amount * 100)::numeric, 1)
          ELSE 0
        END as progress_percent
      FROM goals g
      WHERE g.user_id = $1
    `;

    const params = [req.userId];

    if (status && status !== 'all') {
      query += ` AND g.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY g.priority DESC, g.deadline ASC NULLS LAST, g.created_at DESC`;

    const result = await pool.query(query, params);

    // Formatar resposta
    const goals = result.rows.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      progressPercent: parseFloat(g.progress_percent),
      deadline: g.deadline,
      priority: g.priority,
      category: g.category,
      status: g.status,
      viabilityScore: g.viability_score,
      monthlyContribution: g.monthly_contribution ? parseFloat(g.monthly_contribution) : null,
      actionPlan: g.action_plan,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));

    res.json({ goals });
  } catch (error) {
    logger.error('[Goals] List error:', error);
    res.status(500).json({ error: 'Erro ao listar objetivos' });
  }
});

/**
 * GET /goals/:id
 * Detalhe de um objetivo com histórico de contribuições
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar objetivo
    const goalResult = await pool.query(`
      SELECT * FROM goals
      WHERE id = $1 AND user_id = $2
    `, [id, req.userId]);

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }

    const g = goalResult.rows[0];

    // Buscar contribuições
    const contributionsResult = await pool.query(`
      SELECT id, amount, date, source, note, created_at
      FROM goal_contributions
      WHERE goal_id = $1
      ORDER BY date DESC, created_at DESC
      LIMIT 50
    `, [id]);

    // Calcular estatísticas
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_contributions,
        COALESCE(SUM(amount), 0) as total_contributed,
        COALESCE(AVG(amount), 0) as avg_contribution,
        MIN(date) as first_contribution,
        MAX(date) as last_contribution
      FROM goal_contributions
      WHERE goal_id = $1
    `, [id]);

    const stats = statsResult.rows[0];

    // Calcular projeção
    const remaining = parseFloat(g.target_amount) - parseFloat(g.current_amount);
    const avgContribution = parseFloat(stats.avg_contribution) || 0;
    const monthsToComplete = avgContribution > 0
      ? Math.ceil(remaining / avgContribution)
      : null;

    res.json({
      goal: {
        id: g.id,
        name: g.name,
        description: g.description,
        targetAmount: parseFloat(g.target_amount),
        currentAmount: parseFloat(g.current_amount),
        progressPercent: g.target_amount > 0
          ? Math.round((g.current_amount / g.target_amount) * 100 * 10) / 10
          : 0,
        deadline: g.deadline,
        priority: g.priority,
        category: g.category,
        status: g.status,
        viabilityScore: g.viability_score,
        monthlyContribution: g.monthly_contribution ? parseFloat(g.monthly_contribution) : null,
        actionPlan: g.action_plan,
        createdAt: g.created_at,
        updatedAt: g.updated_at
      },
      contributions: contributionsResult.rows.map(c => ({
        id: c.id,
        amount: parseFloat(c.amount),
        date: c.date,
        source: c.source,
        note: c.note,
        createdAt: c.created_at
      })),
      stats: {
        totalContributions: parseInt(stats.total_contributions),
        totalContributed: parseFloat(stats.total_contributed),
        avgContribution,
        firstContribution: stats.first_contribution,
        lastContribution: stats.last_contribution,
        remaining,
        monthsToComplete
      }
    });
  } catch (error) {
    logger.error('[Goals] Detail error:', error);
    res.status(500).json({ error: 'Erro ao buscar objetivo' });
  }
});

/**
 * POST /goals
 * Cria novo objetivo com análise de viabilidade
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, targetAmount, deadline, priority, category, analyzeNow } = req.body;

    // Validações
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ error: 'Valor alvo deve ser maior que zero' });
    }

    // Criar objetivo
    const insertResult = await pool.query(`
      INSERT INTO goals (user_id, name, description, target_amount, deadline, priority, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      req.userId,
      name.trim(),
      description || null,
      targetAmount,
      deadline || null,
      priority || 'medium',
      category || 'savings'
    ]);

    const goal = insertResult.rows[0];

    let analysis = null;

    // Analisar viabilidade se solicitado
    if (analyzeNow !== false) {
      try {
        analysis = await analyzeGoalViability(req.userId, {
          name,
          targetAmount,
          deadline,
          priority,
          category
        });

        // Atualizar objetivo com análise
        await pool.query(`
          UPDATE goals
          SET
            viability_score = $2,
            action_plan = $3,
            monthly_contribution = $4
          WHERE id = $1
        `, [
          goal.id,
          analysis.viabilityScore,
          JSON.stringify(analysis),
          analysis.monthlyContributionSuggested
        ]);

        goal.viability_score = analysis.viabilityScore;
        goal.action_plan = analysis;
        goal.monthly_contribution = analysis.monthlyContributionSuggested;
      } catch (analysisError) {
        logger.error('[Goals] Analysis error:', analysisError);
        // Continua sem análise se falhar
      }
    }

    res.status(201).json({
      success: true,
      goal: {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        targetAmount: parseFloat(goal.target_amount),
        currentAmount: 0,
        deadline: goal.deadline,
        priority: goal.priority,
        category: goal.category,
        status: goal.status,
        viabilityScore: goal.viability_score,
        monthlyContribution: goal.monthly_contribution ? parseFloat(goal.monthly_contribution) : null,
        actionPlan: goal.action_plan
      },
      analysis
    });
  } catch (error) {
    logger.error('[Goals] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar objetivo' });
  }
});

/**
 * PUT /goals/:id
 * Atualiza objetivo
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, targetAmount, deadline, priority, category, status } = req.body;

    // Verificar se existe e pertence ao usuário
    const existing = await pool.query(
      'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }

    // Construir query de update dinamicamente
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (targetAmount !== undefined) {
      updates.push(`target_amount = $${paramCount++}`);
      values.push(targetAmount);
    }
    if (deadline !== undefined) {
      updates.push(`deadline = $${paramCount++}`);
      values.push(deadline);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(req.userId);

    const query = `
      UPDATE goals
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const goal = result.rows[0];

    res.json({
      success: true,
      goal: {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        targetAmount: parseFloat(goal.target_amount),
        currentAmount: parseFloat(goal.current_amount),
        deadline: goal.deadline,
        priority: goal.priority,
        category: goal.category,
        status: goal.status,
        viabilityScore: goal.viability_score,
        monthlyContribution: goal.monthly_contribution ? parseFloat(goal.monthly_contribution) : null,
        actionPlan: goal.action_plan
      }
    });
  } catch (error) {
    logger.error('[Goals] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar objetivo' });
  }
});

/**
 * DELETE /goals/:id
 * Remove objetivo
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }

    res.json({ success: true, message: 'Objetivo removido' });
  } catch (error) {
    logger.error('[Goals] Delete error:', error);
    res.status(500).json({ error: 'Erro ao remover objetivo' });
  }
});

/**
 * POST /goals/:id/contribute
 * Adiciona contribuição ao objetivo
 */
router.post('/:id/contribute', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, source, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    // Verificar se objetivo existe
    const goalResult = await pool.query(
      'SELECT id, target_amount, current_amount FROM goals WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }

    const goal = goalResult.rows[0];

    // Inserir contribuição (trigger atualiza current_amount automaticamente)
    const contributionResult = await pool.query(`
      INSERT INTO goal_contributions (goal_id, amount, date, source, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      id,
      amount,
      date || new Date().toISOString().split('T')[0],
      source || 'manual',
      note || null
    ]);

    const contribution = contributionResult.rows[0];

    // Buscar valor atualizado
    const updatedGoal = await pool.query(
      'SELECT current_amount FROM goals WHERE id = $1',
      [id]
    );

    const newCurrentAmount = parseFloat(updatedGoal.rows[0].current_amount);
    const targetAmount = parseFloat(goal.target_amount);
    const progressPercent = Math.round((newCurrentAmount / targetAmount) * 100 * 10) / 10;

    // Verificar se atingiu a meta
    const completed = newCurrentAmount >= targetAmount;
    if (completed) {
      await pool.query(
        `UPDATE goals SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [id]
      );
    }

    res.status(201).json({
      success: true,
      contribution: {
        id: contribution.id,
        amount: parseFloat(contribution.amount),
        date: contribution.date,
        source: contribution.source,
        note: contribution.note
      },
      goalUpdate: {
        currentAmount: newCurrentAmount,
        progressPercent,
        completed
      }
    });
  } catch (error) {
    logger.error('[Goals] Contribute error:', error);
    res.status(500).json({ error: 'Erro ao registrar contribuição' });
  }
});

/**
 * DELETE /goals/:id/contributions/:contributionId
 * Remove uma contribuição
 */
router.delete('/:id/contributions/:contributionId', async (req, res) => {
  try {
    const { id, contributionId } = req.params;

    // Verificar se objetivo pertence ao usuário
    const goalCheck = await pool.query(
      'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }

    // Remover contribuição (trigger atualiza current_amount)
    const result = await pool.query(
      'DELETE FROM goal_contributions WHERE id = $1 AND goal_id = $2 RETURNING id',
      [contributionId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contribuição não encontrada' });
    }

    // Buscar valor atualizado
    const updatedGoal = await pool.query(
      'SELECT current_amount, target_amount FROM goals WHERE id = $1',
      [id]
    );

    const goal = updatedGoal.rows[0];
    const currentAmount = parseFloat(goal.current_amount);
    const targetAmount = parseFloat(goal.target_amount);

    res.json({
      success: true,
      goalUpdate: {
        currentAmount,
        progressPercent: Math.round((currentAmount / targetAmount) * 100 * 10) / 10
      }
    });
  } catch (error) {
    logger.error('[Goals] Remove contribution error:', error);
    res.status(500).json({ error: 'Erro ao remover contribuição' });
  }
});

/**
 * POST /goals/:id/analyze
 * Reanalisar viabilidade do objetivo
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await refreshGoalAnalysis(id, req.userId);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    logger.error('[Goals] Analyze error:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar objetivo' });
  }
});

/**
 * GET /goals/summary
 * Resumo dos objetivos para dashboard
 */
router.get('/summary/overview', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COALESCE(SUM(target_amount) FILTER (WHERE status = 'active'), 0) as total_target,
        COALESCE(SUM(current_amount) FILTER (WHERE status = 'active'), 0) as total_current,
        COALESCE(SUM(monthly_contribution) FILTER (WHERE status = 'active'), 0) as total_monthly
      FROM goals
      WHERE user_id = $1
    `, [req.userId]);

    const summary = result.rows[0];

    // Buscar próximo objetivo a vencer
    const nextDeadline = await pool.query(`
      SELECT name, deadline, target_amount, current_amount
      FROM goals
      WHERE user_id = $1 AND status = 'active' AND deadline IS NOT NULL
      ORDER BY deadline ASC
      LIMIT 1
    `, [req.userId]);

    res.json({
      activeCount: parseInt(summary.active_count),
      completedCount: parseInt(summary.completed_count),
      totalTarget: parseFloat(summary.total_target),
      totalCurrent: parseFloat(summary.total_current),
      overallProgress: summary.total_target > 0
        ? Math.round((summary.total_current / summary.total_target) * 100)
        : 0,
      totalMonthlyCommitment: parseFloat(summary.total_monthly),
      nextDeadline: nextDeadline.rows[0] || null
    });
  } catch (error) {
    logger.error('[Goals] Summary error:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

export default router;
