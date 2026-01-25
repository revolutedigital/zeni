/**
 * Add Contribution Use Case - Zeni
 *
 * Handles business logic for adding a contribution to a goal.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class AddContributionUseCase {
  /**
   * Execute the use case
   * @param {string} goalId - Goal ID
   * @param {string} userId - User ID
   * @param {Object} data - Contribution data
   * @returns {Object} Contribution with goal update
   */
  async execute(goalId, userId, data) {
    // Validate UUID
    validateUUID(goalId, 'ID do objetivo');

    const { amount, date, source, note } = data;

    // Validate amount
    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Valor deve ser maior que zero');
    }

    // Add contribution
    const result = await goalRepository.addContribution(goalId, userId, {
      amount,
      date,
      source,
      note,
    });

    if (!result) {
      throw ApiError.notFound('Objetivo');
    }

    logger.info(
      { userId, goalId, amount, completed: result.goalUpdate.completed },
      'Goal contribution added'
    );

    return {
      success: true,
      ...result,
    };
  }
}

export const addContributionUseCase = new AddContributionUseCase();
