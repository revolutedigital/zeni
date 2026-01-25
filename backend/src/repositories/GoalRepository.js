/**
 * Goal Repository - Zeni
 *
 * Repository para operações de objetivos financeiros.
 */

import { BaseRepository } from './BaseRepository.js';

export class GoalRepository extends BaseRepository {
  constructor() {
    super('goals');
  }

  /**
   * Busca objetivos com progresso calculado
   */
  async findByUserIdWithProgress(userId, status = null) {
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

    const params = [userId];

    if (status && status !== 'all') {
      query += ` AND g.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY g.priority DESC, g.deadline ASC NULLS LAST, g.created_at DESC`;

    const result = await this.pool.query(query, params);

    return result.rows.map((g) => this.formatGoal(g));
  }

  /**
   * Busca objetivo com detalhes e contribuições
   */
  async findByIdWithDetails(id, userId) {
    // Buscar objetivo
    const goalResult = await this.pool.query(
      `SELECT * FROM goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (goalResult.rows.length === 0) {
      return null;
    }

    const goal = goalResult.rows[0];

    // Buscar contribuições
    const contributionsResult = await this.pool.query(
      `
      SELECT id, amount, date, source, note, created_at
      FROM goal_contributions
      WHERE goal_id = $1
      ORDER BY date DESC, created_at DESC
      LIMIT 50
    `,
      [id]
    );

    // Calcular estatísticas
    const statsResult = await this.pool.query(
      `
      SELECT
        COUNT(*) as total_contributions,
        COALESCE(SUM(amount), 0) as total_contributed,
        COALESCE(AVG(amount), 0) as avg_contribution,
        MIN(date) as first_contribution,
        MAX(date) as last_contribution
      FROM goal_contributions
      WHERE goal_id = $1
    `,
      [id]
    );

    const stats = statsResult.rows[0];
    const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount);
    const avgContribution = parseFloat(stats.avg_contribution) || 0;
    const monthsToComplete = avgContribution > 0 ? Math.ceil(remaining / avgContribution) : null;

    return {
      goal: this.formatGoal(goal),
      contributions: contributionsResult.rows.map((c) => ({
        id: c.id,
        amount: parseFloat(c.amount),
        date: c.date,
        source: c.source,
        note: c.note,
        createdAt: c.created_at,
      })),
      stats: {
        totalContributions: parseInt(stats.total_contributions, 10),
        totalContributed: parseFloat(stats.total_contributed),
        avgContribution,
        firstContribution: stats.first_contribution,
        lastContribution: stats.last_contribution,
        remaining,
        monthsToComplete,
      },
    };
  }

  /**
   * Cria um objetivo
   */
  async createGoal(userId, data) {
    const { name, description, targetAmount, deadline, priority, category } = data;

    const result = await this.pool.query(
      `
      INSERT INTO goals (user_id, name, description, target_amount, deadline, priority, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [userId, name.trim(), description || null, targetAmount, deadline || null, priority || 'medium', category || 'savings']
    );

    return result.rows[0];
  }

  /**
   * Atualiza análise de viabilidade
   */
  async updateAnalysis(id, analysis) {
    await this.pool.query(
      `
      UPDATE goals
      SET
        viability_score = $2,
        action_plan = $3,
        monthly_contribution = $4,
        updated_at = NOW()
      WHERE id = $1
    `,
      [id, analysis.viabilityScore, JSON.stringify(analysis), analysis.monthlyContributionSuggested]
    );
  }

  /**
   * Adiciona contribuição ao objetivo
   */
  async addContribution(goalId, userId, data) {
    const { amount, date, source, note } = data;

    // Verificar se objetivo existe e pertence ao usuário
    const goalResult = await this.pool.query(
      'SELECT id, target_amount, current_amount FROM goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (goalResult.rows.length === 0) {
      return null;
    }

    // Inserir contribuição (trigger atualiza current_amount automaticamente)
    const contributionResult = await this.pool.query(
      `
      INSERT INTO goal_contributions (goal_id, user_id, amount, date, source, note)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [goalId, userId, amount, date || new Date().toISOString().split('T')[0], source || 'manual', note || null]
    );

    const contribution = contributionResult.rows[0];

    // Buscar valor atualizado
    const updatedGoal = await this.pool.query('SELECT current_amount, target_amount FROM goals WHERE id = $1', [goalId]);

    const newCurrentAmount = parseFloat(updatedGoal.rows[0].current_amount);
    const targetAmount = parseFloat(updatedGoal.rows[0].target_amount);
    const progressPercent = Math.round((newCurrentAmount / targetAmount) * 100 * 10) / 10;

    // Verificar se atingiu a meta
    const completed = newCurrentAmount >= targetAmount;
    if (completed) {
      await this.pool.query(`UPDATE goals SET status = 'completed', updated_at = NOW() WHERE id = $1`, [goalId]);
    }

    return {
      contribution: {
        id: contribution.id,
        amount: parseFloat(contribution.amount),
        date: contribution.date,
        source: contribution.source,
        note: contribution.note,
      },
      goalUpdate: {
        currentAmount: newCurrentAmount,
        progressPercent,
        completed,
      },
    };
  }

  /**
   * Remove uma contribuição
   */
  async removeContribution(goalId, contributionId, userId) {
    // Verificar se objetivo pertence ao usuário
    const goalCheck = await this.pool.query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [goalId, userId]);

    if (goalCheck.rows.length === 0) {
      return null;
    }

    // Remover contribuição (trigger atualiza current_amount)
    const result = await this.pool.query('DELETE FROM goal_contributions WHERE id = $1 AND goal_id = $2 RETURNING id', [
      contributionId,
      goalId,
    ]);

    if (result.rows.length === 0) {
      return { found: false };
    }

    // Buscar valor atualizado
    const updatedGoal = await this.pool.query('SELECT current_amount, target_amount FROM goals WHERE id = $1', [goalId]);

    const goal = updatedGoal.rows[0];
    const currentAmount = parseFloat(goal.current_amount);
    const targetAmount = parseFloat(goal.target_amount);

    return {
      found: true,
      goalUpdate: {
        currentAmount,
        progressPercent: Math.round((currentAmount / targetAmount) * 100 * 10) / 10,
      },
    };
  }

  /**
   * Obtém resumo dos objetivos para dashboard
   */
  async getSummary(userId) {
    const result = await this.pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COALESCE(SUM(target_amount) FILTER (WHERE status = 'active'), 0) as total_target,
        COALESCE(SUM(current_amount) FILTER (WHERE status = 'active'), 0) as total_current,
        COALESCE(SUM(monthly_contribution) FILTER (WHERE status = 'active'), 0) as total_monthly
      FROM goals
      WHERE user_id = $1
    `,
      [userId]
    );

    const summary = result.rows[0];

    // Buscar próximo objetivo a vencer
    const nextDeadline = await this.pool.query(
      `
      SELECT name, deadline, target_amount, current_amount
      FROM goals
      WHERE user_id = $1 AND status = 'active' AND deadline IS NOT NULL
      ORDER BY deadline ASC
      LIMIT 1
    `,
      [userId]
    );

    return {
      activeCount: parseInt(summary.active_count, 10),
      completedCount: parseInt(summary.completed_count, 10),
      totalTarget: parseFloat(summary.total_target),
      totalCurrent: parseFloat(summary.total_current),
      overallProgress: summary.total_target > 0 ? Math.round((summary.total_current / summary.total_target) * 100) : 0,
      totalMonthlyCommitment: parseFloat(summary.total_monthly),
      nextDeadline: nextDeadline.rows[0] || null,
    };
  }

  /**
   * Busca objetivos ativos com margem disponível
   */
  async getActiveGoalsWithContributions(userId) {
    const result = await this.pool.query(
      `
      SELECT name, target_amount, current_amount, monthly_contribution, status
      FROM goals
      WHERE user_id = $1 AND status = 'active'
    `,
      [userId]
    );

    return result.rows.map((g) => ({
      name: g.name,
      target: parseFloat(g.target_amount),
      current: parseFloat(g.current_amount),
      monthlyContribution: parseFloat(g.monthly_contribution) || 0,
    }));
  }

  /**
   * Formata objetivo para resposta
   */
  formatGoal(g) {
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      progressPercent: g.progress_percent ? parseFloat(g.progress_percent) : g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100 * 10) / 10 : 0,
      deadline: g.deadline,
      priority: g.priority,
      category: g.category,
      status: g.status,
      viabilityScore: g.viability_score,
      monthlyContribution: g.monthly_contribution ? parseFloat(g.monthly_contribution) : null,
      actionPlan: g.action_plan,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    };
  }
}

// Singleton instance
export const goalRepository = new GoalRepository();

export default GoalRepository;
