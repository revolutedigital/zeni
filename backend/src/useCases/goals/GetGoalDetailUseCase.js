/**
 * Get Goal Detail Use Case - Zeni
 *
 * Handles business logic for retrieving goal details with contributions.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';

export class GetGoalDetailUseCase {
  /**
   * Execute the use case
   * @param {string} id - Goal ID
   * @param {string} userId - User ID
   * @returns {Object} Goal details with contributions and stats
   */
  async execute(id, userId) {
    // Validate UUID
    validateUUID(id, 'ID do objetivo');

    const details = await goalRepository.findByIdWithDetails(id, userId);

    if (!details) {
      throw ApiError.notFound('Objetivo');
    }

    return details;
  }
}

export const getGoalDetailUseCase = new GetGoalDetailUseCase();
