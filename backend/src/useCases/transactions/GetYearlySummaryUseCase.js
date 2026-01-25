/**
 * Get Yearly Summary Use Case - Zeni
 *
 * Handles business logic for retrieving yearly transaction summary.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';

export class GetYearlySummaryUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {number} year - Year to summarize
   * @returns {Object} Yearly summary with monthly breakdown
   */
  async execute(userId, year) {
    const now = new Date();
    const validatedYear = Math.max(2000, Math.min(2100, parseInt(year, 10) || now.getFullYear()));

    const summary = await transactionRepository.getYearlySummary(userId, validatedYear);

    // Add top transactions
    const topTransactions = await transactionRepository.getTopTransactions(userId, validatedYear, 20);

    return {
      ...summary,
      topTransactions,
    };
  }
}

export const getYearlySummaryUseCase = new GetYearlySummaryUseCase();
