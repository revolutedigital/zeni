/**
 * Delete Budget Use Case - Zeni
 *
 * Handles business logic for deleting a budget.
 */

import { budgetRepository } from '../../repositories/BudgetRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class DeleteBudgetUseCase {
  /**
   * Execute the use case
   * @param {string} id - Budget ID
   * @param {string} userId - User ID
   * @returns {Object} Deletion confirmation
   */
  async execute(id, userId) {
    // Validate UUID
    validateUUID(id, 'ID do orçamento');

    // Delete the budget
    const deleted = await budgetRepository.delete(id, userId);

    if (!deleted) {
      throw ApiError.notFound('Orçamento');
    }

    logger.info({ userId, budgetId: id }, 'Budget deleted');

    return { success: true, message: 'Orçamento deletado' };
  }
}

export const deleteBudgetUseCase = new DeleteBudgetUseCase();
