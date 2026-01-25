/**
 * Update Paid Status Use Case - Zeni
 *
 * Handles business logic for updating transaction paid status.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class UpdatePaidStatusUseCase {
  /**
   * Execute the use case
   * @param {string} id - Transaction ID
   * @param {string} userId - User ID
   * @param {boolean} paid - Paid status
   * @returns {Object} Updated transaction
   */
  async execute(id, userId, paid) {
    // Validate UUID
    validateUUID(id, 'ID da transação');

    // Validate paid is boolean
    if (typeof paid !== 'boolean') {
      throw ApiError.badRequest('Status "paid" deve ser true ou false');
    }

    // Update the paid status
    const transaction = await transactionRepository.updatePaidStatus(id, userId, paid);

    if (!transaction) {
      throw ApiError.notFound('Transação');
    }

    logger.info({ userId, transactionId: id, paid }, 'Transaction paid status updated');

    return transaction;
  }
}

export const updatePaidStatusUseCase = new UpdatePaidStatusUseCase();
