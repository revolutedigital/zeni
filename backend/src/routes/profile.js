import { Router } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { logger } from '../services/logger.js';

const router = Router();
router.use(authMiddleware);

// GET /api/profile - retorna perfil do usuário
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar, phone, monthly_income, subscription_tier, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/profile - atualizar nome e/ou avatar
router.put('/', async (req, res) => {
  try {
    const { name, avatar, phone } = req.body;

    // Validar avatar (max ~500KB base64)
    if (avatar && avatar.length > 700000) {
      return res.status(400).json({ error: 'Imagem muito grande. Máximo 500KB.' });
    }

    // Validar nome
    if (name !== undefined && (!name || name.trim().length < 2)) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' });
    }

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        avatar = COALESCE($2, avatar),
        phone = COALESCE($3, phone),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, email, avatar, phone`,
      [name || null, avatar || null, phone || null, req.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    logger.info(`[Profile] Perfil atualizado: ${req.userId}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
