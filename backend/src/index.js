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
import { logger, httpLogger } from './services/logger.js';

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
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Necessário para algumas APIs
}));

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
    // Permitir requests sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

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
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
});

// Rate limit para auth: 10 tentativas por minuto (proteção contra brute force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit para chat/IA: 30 requests por minuto (evita abuso de API Claude)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Limite de mensagens atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
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

// Outras rotas
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);

// ===========================================
// HEALTH CHECK & METRICS
// ===========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Zeni API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
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
app.use((err, req, res, next) => {
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

  // Erro genérico
  res.status(500).json({
    error: isProduction ? 'Erro interno do servidor' : err.message,
    requestId: req.id,
  });
});

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

const shutdown = (signal) => {
  logger.info({ signal }, 'Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  logger.info({
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    cors: allowedOrigins,
  }, `Zeni API started`);

  console.log(`🚀 Zeni API rodando em http://localhost:${PORT}`);
});

export default app;
