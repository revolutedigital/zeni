/**
 * Transactions Routes - Zeni
 *
 * Routes for transaction management using Clean Architecture.
 */

import { Router } from 'express';
import { authMiddleware } from './auth.js';
import { asyncHandler } from '../errors/ApiError.js';
import {
  createTransactionUseCase,
  getTransactionsUseCase,
  updateTransactionUseCase,
  deleteTransactionUseCase,
  getTransactionSummaryUseCase,
  updatePaidStatusUseCase,
  getYearlySummaryUseCase,
} from '../useCases/transactions/index.js';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

/**
 * GET /api/transactions
 * List transactions with optional filters
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { month, year, category_id, type, limit, offset } = req.query;

    const transactions = await getTransactionsUseCase.execute(req.userId, {
      month,
      year,
      categoryId: category_id,
      type,
      limit,
      offset,
    });

    res.json(transactions);
  })
);

/**
 * GET /api/transactions/summary
 * Get monthly summary (income, expenses, by category)
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;

    const summary = await getTransactionSummaryUseCase.execute(req.userId, {
      month,
      year,
    });

    res.json(summary);
  })
);

/**
 * POST /api/transactions
 * Create a new transaction
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { amount, description, date, type, category_id, source, metadata, paid } = req.body;

    const transaction = await createTransactionUseCase.execute(req.userId, {
      amount,
      description,
      date,
      type,
      categoryId: category_id,
      source,
      metadata,
      paid,
    });

    res.status(201).json(transaction);
  })
);

/**
 * PUT /api/transactions/:id
 * Update an existing transaction
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, description, date, type, category_id, paid } = req.body;

    const transaction = await updateTransactionUseCase.execute(id, req.userId, {
      amount,
      description,
      date,
      type,
      categoryId: category_id,
      paid,
    });

    res.json(transaction);
  })
);

/**
 * PATCH /api/transactions/:id/paid
 * Update paid status only
 */
router.patch(
  '/:id/paid',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paid } = req.body;

    const transaction = await updatePaidStatusUseCase.execute(id, req.userId, paid);

    res.json(transaction);
  })
);

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await deleteTransactionUseCase.execute(id, req.userId);

    res.json(result);
  })
);

/**
 * GET /api/transactions/debug/yearly/:year
 * Debug endpoint for yearly summary
 */
router.get(
  '/debug/yearly/:year',
  asyncHandler(async (req, res) => {
    const { year } = req.params;

    const summary = await getYearlySummaryUseCase.execute(req.userId, year);

    res.json(summary);
  })
);

export default router;
