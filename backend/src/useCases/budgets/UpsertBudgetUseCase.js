/**
 * Upsert Budget Use Case - Zeni
 *
 * Handles business logic for creating or updating a budget.
 */

import { budgetRepository } from '../../repositories/BudgetRepository.js';
import { ApiError } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class UpsertBudgetUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} data - Budget data
   * @returns {Object} Created/updated budget
   */
  async execute(userId, data) {
    const { categoryId, amount, month, year } = data;

    // Validate required fields
    if (!categoryId) {
      throw ApiError.badRequest('Categoria é obrigatória');
    }

    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Valor do orçamento deve ser maior que zero');
    }

    const now = new Date();
    const validatedMonth = Math.max(1, Math.min(12, parseInt(month, 10) || (now.getMonth() + 1)));
    const validatedYear = Math.max(2000, Math.min(2100, parseInt(year, 10) || now.getFullYear()));

    const budget = await budgetRepository.upsert(userId, {
      categoryId,
      amount,
      month: validatedMonth,
      year: validatedYear,
    });

    logger.info({ userId, categoryId, amount, month: validatedMonth, year: validatedYear }, 'Budget upserted');

    return budget;
  }
}

export const upsertBudgetUseCase = new UpsertBudgetUseCase();
