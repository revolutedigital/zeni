/**
 * Goals Routes - Zeni
 *
 * Routes for goals management using Clean Architecture.
 */

import { Router } from 'express';
import { authMiddleware } from './auth.js';
import { asyncHandler } from '../errors/ApiError.js';
import {
  getGoalsUseCase,
  getGoalDetailUseCase,
  createGoalUseCase,
  updateGoalUseCase,
  deleteGoalUseCase,
  addContributionUseCase,
  removeContributionUseCase,
  analyzeGoalUseCase,
  getGoalsSummaryUseCase,
} from '../useCases/goals/index.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/goals
 * List all goals for the user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;

    const result = await getGoalsUseCase.execute(req.userId, { status });

    res.json(result);
  })
);

/**
 * GET /api/goals/summary/overview
 * Get goals summary for dashboard
 */
router.get(
  '/summary/overview',
  asyncHandler(async (req, res) => {
    const summary = await getGoalsSummaryUseCase.execute(req.userId);

    res.json(summary);
  })
);

/**
 * GET /api/goals/:id
 * Get goal details with contributions
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const details = await getGoalDetailUseCase.execute(id, req.userId);

    res.json(details);
  })
);

/**
 * POST /api/goals
 * Create a new goal with optional viability analysis
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description, targetAmount, deadline, priority, category, analyzeNow } = req.body;

    const result = await createGoalUseCase.execute(req.userId, {
      name,
      description,
      targetAmount,
      deadline,
      priority,
      category,
      analyzeNow,
    });

    res.status(201).json(result);
  })
);

/**
 * PUT /api/goals/:id
 * Update a goal
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, targetAmount, deadline, priority, category, status } = req.body;

    const result = await updateGoalUseCase.execute(id, req.userId, {
      name,
      description,
      targetAmount,
      deadline,
      priority,
      category,
      status,
    });

    res.json(result);
  })
);

/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await deleteGoalUseCase.execute(id, req.userId);

    res.json(result);
  })
);

/**
 * POST /api/goals/:id/contribute
 * Add a contribution to a goal
 */
router.post(
  '/:id/contribute',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, date, source, note } = req.body;

    const result = await addContributionUseCase.execute(id, req.userId, {
      amount,
      date,
      source,
      note,
    });

    res.status(201).json(result);
  })
);

/**
 * DELETE /api/goals/:id/contributions/:contributionId
 * Remove a contribution from a goal
 */
router.delete(
  '/:id/contributions/:contributionId',
  asyncHandler(async (req, res) => {
    const { id, contributionId } = req.params;

    const result = await removeContributionUseCase.execute(id, contributionId, req.userId);

    res.json(result);
  })
);

/**
 * POST /api/goals/:id/analyze
 * Re-analyze goal viability
 */
router.post(
  '/:id/analyze',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await analyzeGoalUseCase.execute(id, req.userId);

    res.json(result);
  })
);

export default router;
