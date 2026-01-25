/**
 * Base Repository - Zeni
 *
 * Classe base para todos os repositories.
 * Implementa operações CRUD comuns e abstrai acesso ao banco.
 */

import pool from '../db/connection.js';
import { logger } from '../services/logger.js';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * Busca um registro por ID
   */
  async findById(id, userId = null) {
    const query = userId
      ? `SELECT * FROM ${this.tableName} WHERE id = $1 AND user_id = $2`
      : `SELECT * FROM ${this.tableName} WHERE id = $1`;

    const params = userId ? [id, userId] : [id];

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Busca todos os registros de um usuário
   */
  async findByUserId(userId, options = {}) {
    const { orderBy = 'created_at', order = 'DESC', limit = 100, offset = 0 } = options;

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY ${orderBy} ${order}
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Cria um novo registro
   */
  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    logger.debug({ table: this.tableName, id: result.rows[0]?.id }, 'Record created');
    return result.rows[0];
  }

  /**
   * Atualiza um registro
   */
  async update(id, userId, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      return this.findById(id, userId);
    }

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${columns.length + 1} AND user_id = $${columns.length + 2}
      RETURNING *
    `;

    const result = await this.pool.query(query, [...values, id, userId]);
    logger.debug({ table: this.tableName, id }, 'Record updated');
    return result.rows[0] || null;
  }

  /**
   * Deleta um registro
   */
  async delete(id, userId) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.pool.query(query, [id, userId]);
    const deleted = result.rows.length > 0;
    logger.debug({ table: this.tableName, id, deleted }, 'Record delete attempted');
    return deleted;
  }

  /**
   * Conta registros de um usuário
   */
  async countByUserId(userId, conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    for (const [column, value] of Object.entries(conditions)) {
      query += ` AND ${column} = $${paramIndex}`;
      params.push(value);
      paramIndex++;
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Verifica se um registro existe
   */
  async exists(id, userId = null) {
    const query = userId
      ? `SELECT 1 FROM ${this.tableName} WHERE id = $1 AND user_id = $2 LIMIT 1`
      : `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`;

    const params = userId ? [id, userId] : [id];
    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Executa query customizada
   */
  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  /**
   * Inicia uma transação
   */
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit de transação
   */
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback de transação
   */
  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }
}

export default BaseRepository;
