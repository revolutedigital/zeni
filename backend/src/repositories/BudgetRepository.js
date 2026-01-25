/**
 * Budget Repository - Zeni
 *
 * Repository para operações de orçamentos.
 */

import { BaseRepository } from './BaseRepository.js';

export class BudgetRepository extends BaseRepository {
  constructor() {
    super('budgets');
  }

  /**
   * Busca orçamentos do mês com gastos calculados
   */
  async findByMonth(userId, month, year) {
    const result = await this.pool.query(
      `
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
    `,
      [userId, month, year]
    );

    return result.rows.map((row) => ({
      id: row.id,
      budget: parseFloat(row.budget),
      month: row.month,
      year: row.year,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      categoryIcon: row.category_icon,
      spent: parseFloat(row.spent),
      remaining: parseFloat(row.budget) - parseFloat(row.spent),
      percentUsed: Math.round((parseFloat(row.spent) / parseFloat(row.budget)) * 100),
    }));
  }

  /**
   * Cria ou atualiza um orçamento (upsert)
   */
  async upsert(userId, data) {
    const { categoryId, amount, month, year } = data;

    const result = await this.pool.query(
      `
      INSERT INTO budgets (user_id, category_id, amount, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category_id, month, year)
      DO UPDATE SET amount = $3
      RETURNING *
    `,
      [userId, categoryId, amount, month, year]
    );

    return result.rows[0];
  }

  /**
   * Obtém total orçado do mês
   */
  async getTotalBudgeted(userId, month, year) {
    const result = await this.pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM budgets
      WHERE user_id = $1 AND month = $2 AND year = $3
    `,
      [userId, month, year]
    );

    return parseFloat(result.rows[0].total);
  }

  /**
   * Obtém orçamentos que passaram do limite
   */
  async getExceededBudgets(userId, month, year) {
    const result = await this.pool.query(
      `
      SELECT
        b.id,
        b.amount as budget,
        c.name as category_name,
        c.color as category_color,
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
      GROUP BY b.id, b.amount, c.name, c.color
      HAVING COALESCE(SUM(t.amount), 0) > b.amount
    `,
      [userId, month, year]
    );

    return result.rows.map((row) => ({
      id: row.id,
      budget: parseFloat(row.budget),
      categoryName: row.category_name,
      categoryColor: row.category_color,
      spent: parseFloat(row.spent),
      exceeded: parseFloat(row.spent) - parseFloat(row.budget),
    }));
  }

  /**
   * Busca orçamento por categoria e período
   */
  async findByCategoryAndPeriod(userId, categoryId, month, year) {
    const result = await this.pool.query(
      `
      SELECT * FROM budgets
      WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4
    `,
      [userId, categoryId, month, year]
    );

    return result.rows[0] || null;
  }

  /**
   * Copia orçamentos de um mês para outro
   */
  async copyFromMonth(userId, fromMonth, fromYear, toMonth, toYear) {
    const result = await this.pool.query(
      `
      INSERT INTO budgets (user_id, category_id, amount, month, year)
      SELECT user_id, category_id, amount, $3, $4
      FROM budgets
      WHERE user_id = $1 AND month = $2 AND year = $5
      ON CONFLICT (user_id, category_id, month, year) DO NOTHING
      RETURNING *
    `,
      [userId, fromMonth, toMonth, toYear, fromYear]
    );

    return result.rows;
  }

  /**
   * Obtém histórico de orçamentos por categoria
   */
  async getCategoryHistory(userId, categoryId, months = 6) {
    const result = await this.pool.query(
      `
      SELECT
        b.month,
        b.year,
        b.amount as budget,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t ON
        t.category_id = b.category_id AND
        t.user_id = b.user_id AND
        EXTRACT(MONTH FROM t.date) = b.month AND
        EXTRACT(YEAR FROM t.date) = b.year AND
        t.type = 'expense'
      WHERE b.user_id = $1 AND b.category_id = $2
      GROUP BY b.month, b.year, b.amount
      ORDER BY b.year DESC, b.month DESC
      LIMIT $3
    `,
      [userId, categoryId, months]
    );

    return result.rows.map((row) => ({
      month: row.month,
      year: row.year,
      budget: parseFloat(row.budget),
      spent: parseFloat(row.spent),
    }));
  }
}

// Singleton instance
export const budgetRepository = new BudgetRepository();

export default BudgetRepository;
