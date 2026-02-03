/**
 * Transaction Repository - Zeni
 *
 * Repository para operações de transações.
 */

import { BaseRepository } from './BaseRepository.js';

export class TransactionRepository extends BaseRepository {
  constructor() {
    super('transactions');
  }

  /**
   * Busca transações com filtros e join de categoria
   */
  async findWithFilters(userId, filters = {}) {
    const {
      month,
      year,
      categoryId,
      type,
      limit = 50,
      offset = 0,
    } = filters;

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (month && year) {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM t.date) = $${paramCount}`;
      params.push(month);
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM t.date) = $${paramCount}`;
      params.push(year);
    }

    if (categoryId) {
      paramCount++;
      query += ` AND t.category_id = $${paramCount}`;
      params.push(categoryId);
    }

    if (type) {
      paramCount++;
      query += ` AND t.type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Obtém resumo mensal (totais e por categoria)
   */
  async getMonthlySummary(userId, month, year) {
    // Total por tipo
    const totals = await this.pool.query(
      `
      SELECT
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND EXTRACT(YEAR FROM date) = $3
      GROUP BY type
    `,
      [userId, month, year]
    );

    // Por categoria (apenas gastos)
    const byCategory = await this.pool.query(
      `
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
    `,
      [userId, month, year]
    );

    const income = parseFloat(totals.rows.find((r) => r.type === 'income')?.total || 0);
    const expenses = parseFloat(totals.rows.find((r) => r.type === 'expense')?.total || 0);

    return {
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      income,
      expenses,
      balance: income - expenses,
      byCategory: byCategory.rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        icon: r.icon,
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
    };
  }

  /**
   * Obtém resumo anual
   */
  async getYearlySummary(userId, year) {
    // Total de gastos no ano
    const totalExpenses = await this.pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND type = 'expense'
    `,
      [userId, year]
    );

    // Total de receitas no ano
    const totalIncome = await this.pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND type = 'income'
    `,
      [userId, year]
    );

    // Gastos por mês
    const byMonth = await this.pool.query(
      `
      SELECT
        EXTRACT(MONTH FROM date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND type = 'expense'
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `,
      [userId, year]
    );

    // Gastos por categoria
    const byCategory = await this.pool.query(
      `
      SELECT
        c.name,
        SUM(t.amount) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND EXTRACT(YEAR FROM t.date) = $2 AND t.type = 'expense'
      GROUP BY c.name
      ORDER BY total DESC
    `,
      [userId, year]
    );

    return {
      year: parseInt(year, 10),
      expenses: {
        total: parseFloat(totalExpenses.rows[0]?.total) || 0,
        count: parseInt(totalExpenses.rows[0]?.count, 10) || 0,
      },
      income: {
        total: parseFloat(totalIncome.rows[0]?.total) || 0,
        count: parseInt(totalIncome.rows[0]?.count, 10) || 0,
      },
      byMonth: byMonth.rows.map((r) => ({
        month: parseInt(r.month, 10),
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
      byCategory: byCategory.rows.map((r) => ({
        name: r.name,
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
    };
  }

  /**
   * Cria uma transação
   */
  async createTransaction(userId, data) {
    const { amount, description, date, type, categoryId, source = 'manual', metadata, paid = true } = data;

    const result = await this.pool.query(
      `
      INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, metadata, paid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [userId, amount, description, date, type, categoryId, source, metadata, paid]
    );

    return result.rows[0];
  }

  /**
   * Atualiza uma transação
   */
  async updateTransaction(id, userId, data) {
    const { amount, description, date, type, categoryId, paid } = data;

    const result = await this.pool.query(
      `
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
    `,
      [amount, description, date, type, categoryId, paid, id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Atualiza status de pagamento
   */
  async updatePaidStatus(id, userId, paid) {
    const result = await this.pool.query(
      `
      UPDATE transactions
      SET paid = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `,
      [paid, id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Busca últimas transações (para quick stats)
   */
  async getRecentTransactions(userId, limit = 10) {
    const result = await this.pool.query(
      `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $2
    `,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Busca média de gastos dos últimos meses
   */
  async getAverageExpenses(userId, months = 3) {
    const result = await this.pool.query(
      `
      SELECT
        EXTRACT(MONTH FROM date) as month,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1
        AND type = 'expense'
        AND date >= NOW() - make_interval(months => $2)
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month DESC
    `,
      [userId, parseInt(months) || 6]
    );

    const monthlyExpenses = result.rows.map((r) => parseFloat(r.total));
    return monthlyExpenses.length > 0
      ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
      : 0;
  }

  /**
   * Busca maiores transações do período
   */
  async getTopTransactions(userId, year, limit = 20) {
    const result = await this.pool.query(
      `
      SELECT amount, description, date, type,
             (SELECT name FROM categories WHERE id = t.category_id) as category
      FROM transactions t
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
      ORDER BY amount DESC
      LIMIT $3
    `,
      [userId, year, limit]
    );

    return result.rows.map((r) => ({
      amount: parseFloat(r.amount),
      description: r.description,
      date: r.date,
      type: r.type,
      category: r.category,
    }));
  }
}

// Singleton instance
export const transactionRepository = new TransactionRepository();

export default TransactionRepository;
