/**
 * Delete Transaction Use Case - Zeni
 *
 * Handles business logic for deleting a transaction.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class DeleteTransactionUseCase {
  /**
   * Execute the use case
   * @param {string} id - Transaction ID
   * @param {string} userId - User ID
   * @returns {Object} Deletion confirmation
   */
  async execute(id, userId) {
    // Validate UUID
    validateUUID(id, 'ID da transação');

    // Delete the transaction
    const deleted = await transactionRepository.delete(id, userId);

    if (!deleted) {
      throw ApiError.notFound('Transação');
    }

    logger.info({ userId, transactionId: id }, 'Transaction deleted');

    return { success: true, message: 'Transação deletada' };
  }
}

export const deleteTransactionUseCase = new DeleteTransactionUseCase();
