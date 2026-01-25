/**
 * Get Goals Use Case - Zeni
 *
 * Handles business logic for retrieving user goals with progress.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';

export class GetGoalsUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Goals list
   */
  async execute(userId, options = {}) {
    const { status } = options; // 'active', 'completed', 'all'

    const goals = await goalRepository.findByUserIdWithProgress(userId, status);

    return { goals };
  }
}

export const getGoalsUseCase = new GetGoalsUseCase();
