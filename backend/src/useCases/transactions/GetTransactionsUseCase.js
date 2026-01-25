/**
 * Get Transactions Use Case - Zeni
 *
 * Handles business logic for retrieving transactions with filters.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';

export class GetTransactionsUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {Array} List of transactions
   */
  async execute(userId, filters = {}) {
    const {
      month,
      year,
      categoryId,
      type,
      limit = 50,
      offset = 0,
    } = filters;

    // Validate and sanitize limit/offset
    const sanitizedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
    const sanitizedOffset = Math.max(0, parseInt(offset, 10) || 0);

    // Validate month/year if provided
    let validatedMonth = month ? parseInt(month, 10) : null;
    let validatedYear = year ? parseInt(year, 10) : null;

    if (validatedMonth !== null && (validatedMonth < 1 || validatedMonth > 12)) {
      validatedMonth = null;
    }

    if (validatedYear !== null && (validatedYear < 2000 || validatedYear > 2100)) {
      validatedYear = null;
    }

    const transactions = await transactionRepository.findWithFilters(userId, {
      month: validatedMonth,
      year: validatedYear,
      categoryId,
      type,
      limit: sanitizedLimit,
      offset: sanitizedOffset,
    });

    return transactions;
  }
}

export const getTransactionsUseCase = new GetTransactionsUseCase();
