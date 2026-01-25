/**
 * Create Goal Use Case - Zeni
 *
 * Handles business logic for creating a new goal with optional viability analysis.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';
import { analyzeGoalViability } from '../../services/goalAnalyzer.js';
import { ApiError } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class CreateGoalUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} data - Goal data
   * @returns {Object} Created goal with analysis
   */
  async execute(userId, data) {
    const { name, description, targetAmount, deadline, priority, category, analyzeNow = true } = data;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest('Nome é obrigatório');
    }

    if (!targetAmount || targetAmount <= 0) {
      throw ApiError.badRequest('Valor alvo deve ser maior que zero');
    }

    // Create goal
    const goal = await goalRepository.createGoal(userId, {
      name: name.trim(),
      description,
      targetAmount,
      deadline,
      priority,
      category,
    });

    let analysis = null;

    // Analyze viability if requested
    if (analyzeNow) {
      try {
        analysis = await analyzeGoalViability(userId, {
          name,
          targetAmount,
          deadline,
          priority,
          category,
        });

        // Update goal with analysis
        await goalRepository.updateAnalysis(goal.id, analysis);

        goal.viability_score = analysis.viabilityScore;
        goal.action_plan = analysis;
        goal.monthly_contribution = analysis.monthlyContributionSuggested;
      } catch (analysisError) {
        logger.warn({ userId, goalId: goal.id, error: analysisError.message }, 'Goal analysis failed');
        // Continue without analysis if it fails
      }
    }

    logger.info({ userId, goalId: goal.id, name, targetAmount }, 'Goal created');

    return {
      success: true,
      goal: goalRepository.formatGoal(goal),
      analysis,
    };
  }
}

export const createGoalUseCase = new CreateGoalUseCase();
