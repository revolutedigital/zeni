import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { loginSchema, registerSchema, validateBody } from '../validators/schemas.js';
import { logger, auditLogger } from '../services/logger.js';

const router = Router();

// Configurações de segurança
const BCRYPT_ROUNDS = 12; // Aumentado de 10 para maior segurança
const MAX_FAILED_ATTEMPTS = 5; // Máximo de tentativas antes do bloqueio
const LOCKOUT_DURATION_MINUTES = 15; // Duração do bloqueio em minutos

// Cache em memória para tentativas de login (em produção, usar Redis)
const loginAttempts = new Map();

/**
 * Verifica se a conta está bloqueada por excesso de tentativas
 */
function isAccountLocked(email) {
  const attempts = loginAttempts.get(email);
  if (!attempts) return false;

  if (attempts.lockedUntil && new Date() < attempts.lockedUntil) {
    return true;
  }

  // Limpar bloqueio expirado
  if (attempts.lockedUntil && new Date() >= attempts.lockedUntil) {
    loginAttempts.delete(email);
  }

  return false;
}

/**
 * Registra tentativa de login falha
 */
function recordFailedAttempt(email) {
  const attempts = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  attempts.count++;

  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    attempts.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    logger.warn({ email, lockedUntil: attempts.lockedUntil }, 'Account locked due to failed attempts');
  }

  loginAttempts.set(email, attempts);
  return attempts;
}

/**
 * Limpa tentativas após login bem-sucedido
 */
function clearFailedAttempts(email) {
  loginAttempts.delete(email);
}

// Registro com validação
router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se email já existe
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      auditLogger.auth('REGISTER_FAILED', null, false, { reason: 'email_exists', email });
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha (usando rounds mais fortes)
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Criar usuário
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    auditLogger.auth('REGISTER_SUCCESS', user.id, true, { email });
    logger.info({ userId: user.id, email }, 'New user registered');

    res.status(201).json({ user, token });
  } catch (error) {
    logger.error({ err: error }, 'Registration error');
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Login com validação e proteção contra brute force
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar se conta está bloqueada
    if (isAccountLocked(email)) {
      auditLogger.auth('LOGIN_BLOCKED', null, false, { reason: 'account_locked', email });
      return res.status(429).json({
        error: `Conta temporariamente bloqueada. Tente novamente em ${LOCKOUT_DURATION_MINUTES} minutos.`
      });
    }

    // Buscar usuário (apenas campos necessários, não SELECT *)
    const result = await pool.query(
      'SELECT id, name, email, password_hash, avatar FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      recordFailedAttempt(email);
      auditLogger.auth('LOGIN_FAILED', null, false, { reason: 'user_not_found', email });
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const attempts = recordFailedAttempt(email);
      auditLogger.auth('LOGIN_FAILED', user.id, false, {
        reason: 'invalid_password',
        email,
        attemptCount: attempts.count
      });
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Login bem-sucedido - limpar tentativas
    clearFailedAttempts(email);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    auditLogger.auth('LOGIN_SUCCESS', user.id, true, { email });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar || null },
      token
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Token blacklist com expiração (em produção, usar Redis com TTL)
// Map: token -> expiresAt timestamp
const tokenBlacklist = new Map();

// Limpar tokens expirados periodicamente (a cada hora)
setInterval(() => {
  const now = Date.now();
  let removedCount = 0;

  // Remover apenas tokens que já expiraram (não são mais válidos de qualquer forma)
  for (const [token, expiresAt] of tokenBlacklist.entries()) {
    if (expiresAt < now) {
      tokenBlacklist.delete(token);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    logger.debug({ removedCount, remaining: tokenBlacklist.size }, 'Expired tokens cleaned from blacklist');
  }

  // Se ainda estiver muito grande, remover os mais antigos (FIFO)
  if (tokenBlacklist.size > 10000) {
    const entries = Array.from(tokenBlacklist.entries());
    entries.sort((a, b) => a[1] - b[1]); // Ordenar por expiração
    const toRemove = entries.slice(0, entries.length - 5000); // Manter 5000 mais recentes
    for (const [token] of toRemove) {
      tokenBlacklist.delete(token);
    }
    logger.warn({ removed: toRemove.length, remaining: tokenBlacklist.size }, 'Token blacklist trimmed (keeping newest)');
  }
}, 60 * 60 * 1000);

// Logout - invalida o token atual
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    // Verificar se token é válido antes de invalidar
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Adicionar token à blacklist com sua data de expiração
      // exp está em segundos desde epoch, converter para milissegundos
      const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
      tokenBlacklist.set(token, expiresAt);
      auditLogger.auth('LOGOUT_SUCCESS', decoded.userId, true, {});
      logger.info({ userId: decoded.userId }, 'User logged out');
    } catch (jwtError) {
      // Token já inválido/expirado, ainda assim retornar sucesso
      logger.debug({ err: jwtError.message }, 'Logout with invalid token');
    }

    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    logger.error({ err: error }, 'Logout error');
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Middleware de autenticação
export function authMiddleware(req, res, next) {
  // Verificar se JWT_SECRET está configurado (crítico)
  if (!process.env.JWT_SECRET) {
    logger.error('CRITICAL: JWT_SECRET not configured!');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  // Verificar se token está na blacklist (logout)
  if (tokenBlacklist.has(token) && tokenBlacklist.get(token) > Date.now()) {
    return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.warn({ err: error.message }, 'Invalid token');
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export default router;
