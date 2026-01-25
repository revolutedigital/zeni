/**
 * Remove Contribution Use Case - Zeni
 *
 * Handles business logic for removing a contribution from a goal.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class RemoveContributionUseCase {
  /**
   * Execute the use case
   * @param {string} goalId - Goal ID
   * @param {string} contributionId - Contribution ID
   * @param {string} userId - User ID
   * @returns {Object} Goal update
   */
  async execute(goalId, contributionId, userId) {
    // Validate UUIDs
    validateUUID(goalId, 'ID do objetivo');
    validateUUID(contributionId, 'ID da contribuição');

    // Remove contribution
    const result = await goalRepository.removeContribution(goalId, contributionId, userId);

    if (!result) {
      throw ApiError.notFound('Objetivo');
    }

    if (!result.found) {
      throw ApiError.notFound('Contribuição');
    }

    logger.info({ userId, goalId, contributionId }, 'Goal contribution removed');

    return {
      success: true,
      goalUpdate: result.goalUpdate,
    };
  }
}

export const removeContributionUseCase = new RemoveContributionUseCase();
