/**
 * Create Transaction Use Case - Zeni
 *
 * Handles business logic for creating a new transaction.
 */

import { transactionRepository } from '../../repositories/TransactionRepository.js';
import { ApiError } from '../../errors/ApiError.js';
import { logger, auditLogger } from '../../services/logger.js';

export class CreateTransactionUseCase {
  /**
   * Execute the use case
   * @param {string} userId - User ID
   * @param {Object} data - Transaction data
   * @returns {Object} Created transaction
   */
  async execute(userId, data) {
    const { amount, description, date, type, categoryId, source = 'manual', metadata, paid = true } = data;

    // Validate required fields
    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Valor da transação deve ser maior que zero');
    }

    if (!type || !['income', 'expense'].includes(type)) {
      throw ApiError.badRequest('Tipo deve ser "income" ou "expense"');
    }

    if (!description || description.trim().length === 0) {
      throw ApiError.badRequest('Descrição é obrigatória');
    }

    // Validate date
    const transactionDate = date ? new Date(date) : new Date();
    if (isNaN(transactionDate.getTime())) {
      throw ApiError.badRequest('Data inválida');
    }

    // Create the transaction
    const transaction = await transactionRepository.createTransaction(userId, {
      amount,
      description: description.trim(),
      date: transactionDate,
      type,
      categoryId,
      source,
      metadata,
      paid,
    });

    logger.info({ userId, transactionId: transaction.id, type, amount }, 'Transaction created');

    // Audit trail para compliance financeiro
    auditLogger.transaction('CREATE', userId, transaction.id, {
      amount,
      type,
      description: description.trim(),
      source
    });

    return transaction;
  }
}

export const createTransactionUseCase = new CreateTransactionUseCase();
