import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

import transactionsRouter from './routes/transactions.js';
import categoriesRouter from './routes/categories.js';
import budgetsRouter from './routes/budgets.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import subscriptionRouter from './routes/subscription.js';
import notificationsRouter from './routes/notifications.js';
import alertsRouter from './routes/alerts.js';
import onboardingRouter from './routes/onboarding.js';
import goalsRouter from './routes/goals.js';
import profileRouter from './routes/profile.js';
import { logger, httpLogger } from './services/logger.js';
import { runPeriodicChecks } from './services/agenticActions.js';
import { ApiError } from './errors/ApiError.js';
import pool from './db/connection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ===========================================
// SEGURANÇA: Helmet.js - Headers OWASP
// ===========================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // TODO: Remover unsafe-inline quando possível
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      frameAncestors: ["'none'"], // Previne clickjacking
    },
  },
  crossOriginEmbedderPolicy: false, // Necessário para algumas APIs
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  // HSTS - força HTTPS (max-age: 1 ano, includeSubDomains, preload)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // Remove X-Powered-By header (oculta tecnologia do servidor)
  hidePoweredBy: true,
  // Referrer-Policy - controla informações enviadas no header Referer
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ===========================================
// SEGURANÇA: Permissions-Policy Header
// ===========================================
app.use((req, res, next) => {
  // Restringe APIs sensíveis do navegador
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  next();
});

// ===========================================
// SEGURANÇA: CORS Restritivo
// ===========================================
const allowedOrigins = isProduction
  ? [
      'https://zeni.up.railway.app',
      'https://zeni-frontend.up.railway.app',
      process.env.FRONTEND_URL
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Em produção, bloquear requests sem origin para evitar CSRF
    // Em desenvolvimento, permitir para facilitar testes
    if (!origin) {
      if (isProduction) {
        logger.warn('CORS blocked request without origin in production');
        return callback(new Error('Origin header required'));
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'CORS blocked request from unknown origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ===========================================
// SEGURANÇA: Rate Limiting
// ===========================================

// Rate limit geral: 100 requests por minuto por IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Rate limit para auth: 5 tentativas por 5 minutos (proteção contra brute force)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // Máximo 5 tentativas
  message: { error: 'Muitas tentativas de login. Aguarde 5 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skipSuccessfulRequests: true, // Não conta logins bem-sucedidos
});

// Rate limit para chat/IA: 30 requests por minuto (evita abuso de API Claude)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Limite de mensagens atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Rate limit por usuário autenticado: 100 requests por minuto
// Complementa o rate limit por IP para evitar bypass via VPN
const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Limite de requisições atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || 'unknown',
  skip: (req) => !req.userId, // Só aplica para usuários autenticados
  validate: { xForwardedForHeader: false },
});

// ===========================================
// MIDDLEWARES GERAIS
// ===========================================

// Request ID para rastreamento
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// HTTP Logger
app.use(httpLogger);

// Body parser com limite de tamanho
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting geral
app.use('/api', generalLimiter);

// ===========================================
// ROTAS
// ===========================================

// Auth com rate limit específico
app.use('/api/auth', authLimiter, authRouter);

// Chat com rate limit específico (API Claude é cara)
app.use('/api/chat', chatLimiter, chatRouter);

// Outras rotas (com rate limit por usuário para rotas autenticadas)
app.use('/api/transactions', userRateLimiter, transactionsRouter);
app.use('/api/categories', userRateLimiter, categoriesRouter);
app.use('/api/budgets', userRateLimiter, budgetsRouter);
app.use('/api/admin', userRateLimiter, adminRouter);
app.use('/api/subscription', userRateLimiter, subscriptionRouter);
app.use('/api/notifications', userRateLimiter, notificationsRouter);
app.use('/api/alerts', userRateLimiter, alertsRouter);
app.use('/api/onboarding', userRateLimiter, onboardingRouter);
app.use('/api/goals', userRateLimiter, goalsRouter);
app.use('/api/profile', userRateLimiter, profileRouter);

// ===========================================
// HEALTH CHECK & METRICS
// ===========================================

app.get('/api/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    name: 'Zeni API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: 'unknown',
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  try {
    const result = await pool.query('SELECT 1 as ok');
    checks.database = result.rows[0]?.ok === 1 ? 'connected' : 'error';
  } catch (error) {
    checks.database = 'disconnected';
    checks.status = 'unhealthy';
    logger.error({ err: error }, 'Database health check failed');
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

// Endpoint de métricas básicas (para monitoring)
app.get('/api/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    },
    timestamp: new Date().toISOString(),
  });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use((req, res) => {
  logger.warn({ path: req.path, method: req.method }, 'Route not found');
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler global
app.use((err, req, res, _next) => {
  // ApiError - erros operacionais conhecidos
  if (err instanceof ApiError && err.isOperational) {
    logger.warn({
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      requestId: req.id,
    }, 'API Error');

    return res.status(err.statusCode).json(err.toJSON());
  }

  // Log do erro
  logger.error({
    err,
    requestId: req.id,
    path: req.path,
    method: req.method,
    userId: req.userId,
  }, 'Unhandled error');

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origem não permitida' });
  }

  // Validation error (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors,
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Registro já existe' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Referência inválida' });
    }
  }

  // Erro genérico
  res.status(500).json({
    error: isProduction ? 'Erro interno do servidor' : err.message,
    requestId: req.id,
  });
});

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

// Armazenar referências para cleanup
let agenticIntervalId = null;
let agenticTimeoutId = null;

const shutdown = (signal) => {
  logger.info({ signal }, 'Shutting down gracefully...');

  // Limpar intervals/timeouts para evitar memory leaks
  if (agenticIntervalId) {
    clearInterval(agenticIntervalId);
    agenticIntervalId = null;
  }
  if (agenticTimeoutId) {
    clearTimeout(agenticTimeoutId);
    agenticTimeoutId = null;
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ===========================================
// START SERVER
// ===========================================

// Run essential migrations on startup
async function runStartupMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        action_data JSONB NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        executed_at TIMESTAMP,
        result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_actions_pending
      ON scheduled_actions(scheduled_for, status)
      WHERE status = 'pending'
    `);
    // Avatar column for user profile photos
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT');
    logger.info('Startup migrations completed');
  } catch (err) {
    logger.warn({ err: err.message }, 'Startup migrations failed (may already exist)');
  }
}

app.listen(PORT, async () => {
  logger.info({
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    cors: allowedOrigins,
  }, `Zeni API started`);

  // Run migrations before other startup tasks
  await runStartupMigrations();

  logger.info({ url: `http://localhost:${PORT}` }, 'Zeni API started successfully');

  // Iniciar job de ações agenticas (a cada 5 minutos)
  if (isProduction) {
    agenticIntervalId = setInterval(() => {
      runPeriodicChecks().catch(err => {
        logger.error({ err }, 'Agentic actions job failed');
      });
    }, 5 * 60 * 1000); // 5 minutos

    // Executar uma vez na inicialização (após 30 segundos)
    agenticTimeoutId = setTimeout(() => {
      runPeriodicChecks().catch(err => {
        logger.error({ err }, 'Initial agentic check failed');
      });
    }, 30 * 1000);

    logger.info('Agentic actions job scheduled');
  }
});

export default app;
