/**
 * Get Budgets Use Case - Zeni
 *
 * Handles business logic for retrieving monthly budgets with spending data.
 */

import { budgetRepository } from '../../repositories/BudgetRepository.js';

export class GetBudgetsUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} List of budgets with spending data
   */
  async execute(userId, options = {}) {
    const now = new Date();
    const {
      month = now.getMonth() + 1,
      year = now.getFullYear(),
    } = options;

    // Validate month/year
    const validatedMonth = Math.max(1, Math.min(12, parseInt(month, 10) || (now.getMonth() + 1)));
    const validatedYear = Math.max(2000, Math.min(2100, parseInt(year, 10) || now.getFullYear()));

    const budgets = await budgetRepository.findByMonth(userId, validatedMonth, validatedYear);

    return budgets;
  }
}

export const getBudgetsUseCase = new GetBudgetsUseCase();
