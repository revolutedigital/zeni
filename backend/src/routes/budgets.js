/**
 * Budgets Routes - Zeni
 *
 * Routes for budget management using Clean Architecture.
 */

import { Router } from 'express';
import { authMiddleware } from './auth.js';
import { asyncHandler } from '../errors/ApiError.js';
import {
  getBudgetsUseCase,
  upsertBudgetUseCase,
  deleteBudgetUseCase,
} from '../useCases/budgets/index.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/budgets
 * List budgets for a specific month with spending data
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;

    const budgets = await getBudgetsUseCase.execute(req.userId, {
      month,
      year,
    });

    res.json(budgets);
  })
);

/**
 * POST /api/budgets
 * Create or update a budget (upsert)
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { category_id, amount, month, year } = req.body;

    const budget = await upsertBudgetUseCase.execute(req.userId, {
      categoryId: category_id,
      amount,
      month,
      year,
    });

    res.status(201).json(budget);
  })
);

/**
 * DELETE /api/budgets/:id
 * Delete a budget
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await deleteBudgetUseCase.execute(id, req.userId);

    res.json(result);
  })
);

export default router;
