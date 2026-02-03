/**
 * Goals Routes - Zeni
 *
 * Routes for goals management using Clean Architecture.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Rate limit específico para análise de goals (chama Claude API - caro)
const analyzeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Máximo 5 análises por hora por usuário
  message: { error: 'Limite de análises atingido. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId, // Rate limit por usuário, não por IP
  validate: { xForwardedForHeader: false },
});

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
 * Re-analyze goal viability (rate limited - Claude API is expensive)
 */
router.post(
  '/:id/analyze',
  analyzeRateLimiter,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await analyzeGoalUseCase.execute(id, req.userId);

    res.json(result);
  })
);

export default router;
