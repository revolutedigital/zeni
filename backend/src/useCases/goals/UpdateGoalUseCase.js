/**
 * Update Goal Use Case - Zeni
 *
 * Handles business logic for updating an existing goal.
 */

import { goalRepository } from '../../repositories/GoalRepository.js';
import { ApiError, validateUUID } from '../../errors/ApiError.js';
import { logger } from '../../services/logger.js';

export class UpdateGoalUseCase {
  /**
   * Execute the use case
   * @param {string} id - Goal ID
   * @param {string} userId - User ID
   * @param {Object} data - Update data
   * @returns {Object} Updated goal
   */
  async execute(id, userId, data) {
    // Validate UUID
    validateUUID(id, 'ID do objetivo');

    const { name, description, targetAmount, deadline, priority, category, status } = data;

    // Check if goal exists
    const existing = await goalRepository.findById(id, userId);
    if (!existing) {
      throw ApiError.notFound('Objetivo');
    }

    // Validate name if provided
    if (name !== undefined && name.trim().length === 0) {
      throw ApiError.badRequest('Nome não pode ser vazio');
    }

    // Validate targetAmount if provided
    if (targetAmount !== undefined && targetAmount <= 0) {
      throw ApiError.badRequest('Valor alvo deve ser maior que zero');
    }

    // Validate status if provided
    const validStatuses = ['active', 'completed', 'paused', 'cancelled'];
    if (status !== undefined && !validStatuses.includes(status)) {
      throw ApiError.badRequest(`Status inválido. Use: ${validStatuses.join(', ')}`);
    }

    // Validate priority if provided
    const validPriorities = ['low', 'medium', 'high'];
    if (priority !== undefined && !validPriorities.includes(priority)) {
      throw ApiError.badRequest(`Prioridade inválida. Use: ${validPriorities.join(', ')}`);
    }

    // Update goal
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (targetAmount !== undefined) updateData.target_amount = targetAmount;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      throw ApiError.badRequest('Nenhum campo para atualizar');
    }

    const goal = await goalRepository.update(id, userId, updateData);

    logger.info({ userId, goalId: id }, 'Goal updated');

    return {
      success: true,
      goal: goalRepository.formatGoal(goal),
    };
  }
}

export const updateGoalUseCase = new UpdateGoalUseCase();
