/**
 * Admin Routes - Zeni
 *
 * Rotas administrativas para analytics e gestão
 * Protegidas por autenticação admin
 */

import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import analytics from '../services/analytics.js';
import { logger } from '../services/logger.js';

const router = Router();

// Middleware para verificar se é admin
async function adminMiddleware(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );

    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro de autorização' });
  }
}

// Aplicar auth em todas as rotas
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * GET /admin/analytics
 * Dashboard completo de analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const dashboard = await analytics.getAnalyticsDashboard();
    res.json(dashboard);
  } catch (error) {
    logger.error('[Admin] Analytics error:', error);
    res.status(500).json({ error: 'Erro ao buscar analytics' });
  }
});

/**
 * GET /admin/analytics/dau
 * DAU trend dos últimos N dias
 */
router.get('/analytics/dau', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const trend = await analytics.getDAUTrend(parseInt(days));
    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar DAU' });
  }
});

/**
 * GET /admin/analytics/features
 * Uso por feature/agente
 */
router.get('/analytics/features', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const usage = await analytics.getFeatureUsage(parseInt(days));
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar feature usage' });
  }
});

/**
 * GET /admin/users
 * Lista de usuários com métricas
 */
router.get('/users', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.subscription_tier,
        COUNT(DISTINCT t.id) as transaction_count,
        COUNT(DISTINCT ch.id) as chat_count,
        MAX(ch.created_at) as last_activity
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      LEFT JOIN chat_history ch ON ch.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('[Admin] Users error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

/**
 * GET /admin/revenue
 * Métricas de receita (para planos premium)
 */
router.get('/revenue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        subscription_tier,
        COUNT(*) as user_count
      FROM users
      GROUP BY subscription_tier
    `);

    // Pricing (placeholder - ajustar conforme planos reais)
    const pricing = {
      free: 0,
      premium: 29.90,
      business: 99.90
    };

    const tiers = result.rows.map(row => ({
      tier: row.subscription_tier || 'free',
      userCount: parseInt(row.user_count),
      mrr: parseInt(row.user_count) * (pricing[row.subscription_tier] || 0)
    }));

    const totalMRR = tiers.reduce((sum, t) => sum + t.mrr, 0);
    const totalUsers = tiers.reduce((sum, t) => sum + t.userCount, 0);

    res.json({
      tiers,
      totalMRR,
      totalUsers,
      arpu: totalUsers > 0 ? (totalMRR / totalUsers).toFixed(2) : 0
    });
  } catch (error) {
    logger.error('[Admin] Revenue error:', error);
    res.status(500).json({ error: 'Erro ao buscar revenue' });
  }
});

/**
 * GET /admin/health
 * Health check do sistema
 */
router.get('/health', async (req, res) => {
  try {
    // Check database
    const dbCheck = await pool.query('SELECT NOW()');

    // Check tables
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    // Recent errors (from logs if available)
    const recentChats = await pool.query(`
      SELECT COUNT(*) as count
      FROM chat_history
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `);

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: dbCheck.rows[0].now,
      tables: tables.rows.map(r => r.table_name),
      lastHourActivity: {
        chatMessages: parseInt(recentChats.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
