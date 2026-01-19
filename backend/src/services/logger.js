/**
 * Logger Estruturado - Zeni
 *
 * Usa Pino para logging de alta performance com:
 * - Logs em JSON (produção) ou pretty print (dev)
 * - Request ID para rastreamento
 * - Níveis: trace, debug, info, warn, error, fatal
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Configuração do logger principal
export const logger = pino({
  level: logLevel,
  ...(isProduction
    ? {
        // Produção: JSON puro para parsing por ferramentas
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        // Desenvolvimento: Pretty print
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
  base: {
    service: 'zeni-api',
    version: process.env.npm_package_version || '1.0.0',
  },
});

/**
 * Middleware de logging HTTP
 * Loga todas as requisições com tempo de resposta
 */
export const httpLogger = (req, res, next) => {
  const start = Date.now();

  // Log ao finalizar response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      userId: req.userId || null,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']?.substring(0, 100),
    };

    // Nível de log baseado no status code
    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request Warning');
    } else {
      logger.info(logData, 'HTTP Request');
    }
  });

  next();
};

/**
 * Logger para agentes de IA
 * Tracking de qual agente foi usado e tempo de resposta
 */
export const agentLogger = {
  start: (agent, userId) => {
    return {
      agent,
      userId,
      startTime: Date.now(),
    };
  },

  end: (context, success = true, error = null) => {
    const duration = Date.now() - context.startTime;
    const logData = {
      agent: context.agent,
      userId: context.userId,
      duration: `${duration}ms`,
      success,
    };

    if (error) {
      logger.error({ ...logData, error: error.message }, 'Agent execution failed');
    } else {
      logger.info(logData, 'Agent execution completed');
    }

    return duration;
  },
};

/**
 * Logger para auditoria de ações financeiras
 * Importante para compliance
 */
export const auditLogger = {
  transaction: (action, userId, transactionId, data) => {
    logger.info({
      type: 'AUDIT',
      action,
      userId,
      transactionId,
      data,
      timestamp: new Date().toISOString(),
    }, `Transaction ${action}`);
  },

  budget: (action, userId, budgetId, data) => {
    logger.info({
      type: 'AUDIT',
      action,
      userId,
      budgetId,
      data,
      timestamp: new Date().toISOString(),
    }, `Budget ${action}`);
  },

  auth: (action, userId, success, details = {}) => {
    const level = success ? 'info' : 'warn';
    logger[level]({
      type: 'AUDIT',
      action,
      userId,
      success,
      ...details,
      timestamp: new Date().toISOString(),
    }, `Auth ${action}`);
  },
};

export default logger;
