/**
 * Get Transaction Summary Use Case - Zeni
 *
 * Handles business logic for retrieving monthly transaction summary.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';

export class GetTransactionSummaryUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Monthly summary
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

    const summary = await transactionRepository.getMonthlySummary(
      userId,
      validatedMonth,
      validatedYear
    );

    return summary;
  }
}

export const getTransactionSummaryUseCase = new GetTransactionSummaryUseCase();
