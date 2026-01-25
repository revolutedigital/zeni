import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { logger } from '../services/logger.js';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// Listar transações
router.get('/', async (req, res) => {
  try {
    const { month, year, category_id, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.userId];
    let paramCount = 1;

    if (month && year) {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM t.date) = $${paramCount}`;
      params.push(month);
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM t.date) = $${paramCount}`;
      params.push(year);
    }

    if (category_id) {
      paramCount++;
      query += ` AND t.category_id = $${paramCount}`;
      params.push(category_id);
    }

    if (type) {
      paramCount++;
      query += ` AND t.type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao listar transações:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Resumo do mês
router.get('/summary', async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    // Total por tipo
    const totals = await pool.query(`
      SELECT
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND EXTRACT(YEAR FROM date) = $3
      GROUP BY type
    `, [req.userId, month, year]);

    // Por categoria
    const byCategory = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.color,
        c.icon,
        SUM(t.amount) as total,
        COUNT(*) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
        AND EXTRACT(MONTH FROM t.date) = $2
        AND EXTRACT(YEAR FROM t.date) = $3
        AND t.type = 'expense'
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total DESC
    `, [req.userId, month, year]);

    const income = totals.rows.find(r => r.type === 'income')?.total || 0;
    const expenses = totals.rows.find(r => r.type === 'expense')?.total || 0;

    res.json({
      month: parseInt(month),
      year: parseInt(year),
      income: parseFloat(income),
      expenses: parseFloat(expenses),
      balance: parseFloat(income) - parseFloat(expenses),
      byCategory: byCategory.rows
    });
  } catch (error) {
    logger.error('Erro ao gerar resumo:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar transação
router.post('/', async (req, res) => {
  try {
    const { amount, description, date, type, category_id, source = 'manual', metadata, paid = true } = req.body;

    const result = await pool.query(`
      INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, metadata, paid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.userId, amount, description, date, type, category_id, source, metadata, paid]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Atualizar transação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, date, type, category_id, paid } = req.body;

    const result = await pool.query(`
      UPDATE transactions
      SET amount = COALESCE($1, amount),
          description = COALESCE($2, description),
          date = COALESCE($3, date),
          type = COALESCE($4, type),
          category_id = COALESCE($5, category_id),
          paid = COALESCE($6, paid),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [amount, description, date, type, category_id, paid, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Marcar transação como paga/não paga
router.patch('/:id/paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid } = req.body;

    const result = await pool.query(`
      UPDATE transactions
      SET paid = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [paid, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar transação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json({ message: 'Transação deletada' });
  } catch (error) {
    logger.error('Erro ao deletar transação:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DEBUG: Verificar totais por ano
router.get('/debug/yearly/:year', async (req, res) => {
  try {
    const { year } = req.params;

    // Total de gastos no ano
    const totalExpenses = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND type = 'expense'
    `, [req.userId, year]);

    // Total de receitas no ano
    const totalIncome = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND type = 'income'
    `, [req.userId, year]);

    // Gastos por mês
    const byMonth = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND type = 'expense'
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `, [req.userId, year]);

    // Gastos por categoria
    const byCategory = await pool.query(`
      SELECT
        c.name,
        SUM(t.amount) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND EXTRACT(YEAR FROM t.date) = $2 AND t.type = 'expense'
      GROUP BY c.name
      ORDER BY total DESC
    `, [req.userId, year]);

    // Algumas transações de exemplo (maiores valores)
    const samples = await pool.query(`
      SELECT amount, description, date, type,
             (SELECT name FROM categories WHERE id = t.category_id) as category
      FROM transactions t
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
      ORDER BY amount DESC
      LIMIT 20
    `, [req.userId, year]);

    res.json({
      year: parseInt(year),
      expenses: {
        total: parseFloat(totalExpenses.rows[0].total),
        count: parseInt(totalExpenses.rows[0].count)
      },
      income: {
        total: parseFloat(totalIncome.rows[0].total),
        count: parseInt(totalIncome.rows[0].count)
      },
      byMonth: byMonth.rows.map(r => ({
        month: parseInt(r.month),
        total: parseFloat(r.total),
        count: parseInt(r.count)
      })),
      byCategory: byCategory.rows.map(r => ({
        name: r.name,
        total: parseFloat(r.total),
        count: parseInt(r.count)
      })),
      topTransactions: samples.rows.map(r => ({
        amount: parseFloat(r.amount),
        description: r.description,
        date: r.date,
        type: r.type,
        category: r.category
      }))
    });
  } catch (error) {
    logger.error('Erro no debug:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
