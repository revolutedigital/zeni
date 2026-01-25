/**
 * Delete Goal Use Case - Zeni
 *
 * Handles business logic for deleting a goal.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class DeleteGoalUseCase {
  /**
   * Execute the use case
   * @param {string} id - Goal ID
   * @param {string} userId - User ID
   * @returns {Object} Deletion confirmation
   */
  async execute(id, userId) {
    // Validate UUID
    validateUUID(id, 'ID do objetivo');

    // Delete the goal (cascades to contributions)
    const deleted = await goalRepository.delete(id, userId);

    if (!deleted) {
      throw ApiError.notFound('Objetivo');
    }

    logger.info({ userId, goalId: id }, 'Goal deleted');

    return { success: true, message: 'Objetivo removido' };
  }
}

export const deleteGoalUseCase = new DeleteGoalUseCase();
