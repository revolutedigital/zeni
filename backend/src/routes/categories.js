import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

// Listar categorias (pública)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;

    let query = 'SELECT * FROM categories';
    const params = [];

    if (type) {
      query += ' WHERE type = $1 OR type = $2';
      params.push(type, 'both');
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
