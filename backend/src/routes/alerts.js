/**
 * Alerts Routes - Zeni
 *
 * Rotas para gerenciar alertas agendados
 */

import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import {
  scheduleAction,
  checkAndScheduleBudgetAlerts,
  checkAndScheduleBillReminders
} from '../services/agenticActions.js';
import { logger } from '../services/logger.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /alerts
 * Lista alertas agendados do usuário
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, alert_type, title, message, scheduled_for, recurring, is_active
      FROM scheduled_alerts
      WHERE user_id = $1 AND is_active = true
      ORDER BY scheduled_for ASC
    `, [req.userId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('[Alerts] List error:', error);
    res.status(500).json({ error: 'Erro ao listar alertas' });
  }
});

/**
 * POST /alerts
 * Cria novo alerta agendado
 */
router.post('/', async (req, res) => {
  try {
    const { alertType, title, message, scheduledFor, recurring } = req.body;

    if (!alertType || !title || !scheduledFor) {
      return res.status(400).json({ error: 'Campos obrigatórios: alertType, title, scheduledFor' });
    }

    const result = await pool.query(`
      INSERT INTO scheduled_alerts (user_id, alert_type, title, message, scheduled_for, recurring)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.userId, alertType, title, message, scheduledFor, recurring]);

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('[Alerts] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar alerta' });
  }
});

/**
 * DELETE /alerts/:id
 * Remove/desativa alerta
 */
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`
      UPDATE scheduled_alerts
      SET is_active = false
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);

    res.json({ success: true });
  } catch (error) {
    logger.error('[Alerts] Delete error:', error);
    res.status(500).json({ error: 'Erro ao remover alerta' });
  }
});

/**
 * POST /alerts/check-budgets
 * Força verificação de alertas de orçamento
 */
router.post('/check-budgets', async (req, res) => {
  try {
    await checkAndScheduleBudgetAlerts(req.userId);
    res.json({ success: true, message: 'Verificação de orçamentos executada' });
  } catch (error) {
    logger.error('[Alerts] Check budgets error:', error);
    res.status(500).json({ error: 'Erro ao verificar orçamentos' });
  }
});

/**
 * POST /alerts/check-bills
 * Força verificação de contas pendentes
 */
router.post('/check-bills', async (req, res) => {
  try {
    await checkAndScheduleBillReminders(req.userId);
    res.json({ success: true, message: 'Verificação de contas executada' });
  } catch (error) {
    logger.error('[Alerts] Check bills error:', error);
    res.status(500).json({ error: 'Erro ao verificar contas' });
  }
});

/**
 * GET /alerts/pending-actions
 * Lista ações pendentes do usuário (para debug)
 */
router.get('/pending-actions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, action_type, action_data, scheduled_for, status, created_at
      FROM scheduled_actions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.userId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('[Alerts] Pending actions error:', error);
    res.status(500).json({ error: 'Erro ao listar ações' });
  }
});

/**
 * POST /alerts/schedule-reminder
 * Agenda lembrete personalizado via chat
 */
router.post('/schedule-reminder', async (req, res) => {
  try {
    const { description, amount, dueDate, reminderDate } = req.body;

    if (!description || !reminderDate) {
      return res.status(400).json({ error: 'Campos obrigatórios: description, reminderDate' });
    }

    const actionId = await scheduleAction(req.userId, 'bill_reminder', {
      description,
      amount: amount || 0,
      dueDate: dueDate || reminderDate
    }, new Date(reminderDate));

    res.json({
      success: true,
      message: 'Lembrete agendado!',
      actionId
    });
  } catch (error) {
    logger.error('[Alerts] Schedule reminder error:', error);
    res.status(500).json({ error: 'Erro ao agendar lembrete' });
  }
});

export default router;
