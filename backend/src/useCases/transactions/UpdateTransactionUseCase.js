/**
 * Update Transaction Use Case - Zeni
 *
 * Handles business logic for updating an existing transaction.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class UpdateTransactionUseCase {
  /**
   * Execute the use case
   * @param {string} id - Transaction ID
   * @param {string} userId - User ID
   * @param {Object} data - Update data
   * @returns {Object} Updated transaction
   */
  async execute(id, userId, data) {
    // Validate UUID
    validateUUID(id, 'ID da transação');

    const { amount, description, date, type, categoryId, paid } = data;

    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      throw ApiError.badRequest('Valor da transação deve ser maior que zero');
    }

    // Validate type if provided
    if (type !== undefined && !['income', 'expense'].includes(type)) {
      throw ApiError.badRequest('Tipo deve ser "income" ou "expense"');
    }

    // Validate description if provided
    if (description !== undefined && description.trim().length === 0) {
      throw ApiError.badRequest('Descrição não pode ser vazia');
    }

    // Validate date if provided
    let validatedDate = date;
    if (date !== undefined) {
      validatedDate = new Date(date);
      if (isNaN(validatedDate.getTime())) {
        throw ApiError.badRequest('Data inválida');
      }
    }

    // Update the transaction
    const transaction = await transactionRepository.updateTransaction(id, userId, {
      amount,
      description: description?.trim(),
      date: validatedDate,
      type,
      categoryId,
      paid,
    });

    if (!transaction) {
      throw ApiError.notFound('Transação');
    }

    logger.info({ userId, transactionId: id }, 'Transaction updated');

    return transaction;
  }
}

export const updateTransactionUseCase = new UpdateTransactionUseCase();
