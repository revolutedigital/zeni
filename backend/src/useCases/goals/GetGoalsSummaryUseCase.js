/**
 * Get Goals Summary Use Case - Zeni
 *
 * Handles business logic for retrieving goals summary for dashboard.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';

export class GetGoalsSummaryUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @returns {Object} Goals summary
   */
  async execute(userId) {
    const summary = await goalRepository.getSummary(userId);

    return summary;
  }
}

export const getGoalsSummaryUseCase = new GetGoalsSummaryUseCase();
