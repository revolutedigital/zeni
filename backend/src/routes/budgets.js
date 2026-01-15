import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';

const router = Router();

router.use(authMiddleware);

// Listar orçamentos do mês
router.get('/', async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const result = await pool.query(`
      SELECT
        b.id,
        b.amount as budget,
        b.month,
        b.year,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON
        t.category_id = b.category_id AND
        t.user_id = b.user_id AND
        EXTRACT(MONTH FROM t.date) = b.month AND
        EXTRACT(YEAR FROM t.date) = b.year AND
        t.type = 'expense'
      WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
      GROUP BY b.id, b.amount, b.month, b.year, c.id, c.name, c.color, c.icon
      ORDER BY c.name
    `, [req.userId, month, year]);

    res.json(result.rows.map(row => ({
      ...row,
      budget: parseFloat(row.budget),
      spent: parseFloat(row.spent),
      remaining: parseFloat(row.budget) - parseFloat(row.spent),
      percentUsed: Math.round((parseFloat(row.spent) / parseFloat(row.budget)) * 100)
    })));
  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar/atualizar orçamento
router.post('/', async (req, res) => {
  try {
    const { category_id, amount, month, year } = req.body;

    const result = await pool.query(`
      INSERT INTO budgets (user_id, category_id, amount, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category_id, month, year)
      DO UPDATE SET amount = $3
      RETURNING *
    `, [req.userId, category_id, amount, month, year]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar orçamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ message: 'Orçamento deletado' });
  } catch (error) {
    console.error('Erro ao deletar orçamento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
