/**
 * Analyze Goal Use Case - Zeni
 *
 * Handles business logic for re-analyzing goal viability.
 */

import { refreshGoalAnalysis } from '../../services/goalAnalyzer.js';
import { validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class AnalyzeGoalUseCase {
  /**
   * Execute the use case
   * @param {string} goalId - Goal ID
   * @param {string} userId - User ID
   * @returns {Object} Analysis result
   */
  async execute(goalId, userId) {
    // Validate UUID
    validateUUID(goalId, 'ID do objetivo');

    const analysis = await refreshGoalAnalysis(goalId, userId);

    logger.info({ userId, goalId }, 'Goal analysis refreshed');

    return {
      success: true,
      analysis,
    };
  }
}

export const analyzeGoalUseCase = new AnalyzeGoalUseCase();
