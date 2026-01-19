/**
 * Schemas de Validação - Zod
 *
 * Validação rigorosa de todos os inputs da API
 * Proteção contra dados malformados e injection
 */

import { z } from 'zod';

// ===========================================
// SCHEMAS COMUNS
// ===========================================

// UUID válido
export const uuidSchema = z.string().uuid('ID inválido');

// Email válido
export const emailSchema = z
  .string()
  .email('Email inválido')
  .max(255, 'Email muito longo')
  .toLowerCase()
  .trim();

// Senha segura
export const passwordSchema = z
  .string()
  .min(6, 'Senha deve ter pelo menos 6 caracteres')
  .max(100, 'Senha muito longa');

// Valor monetário (positivo, até 2 casas decimais)
export const amountSchema = z
  .number()
  .positive('Valor deve ser positivo')
  .max(999999999.99, 'Valor muito alto')
  .transform((val) => Math.round(val * 100) / 100); // Garante 2 casas decimais

// Data válida (aceita string ISO ou Date)
export const dateSchema = z.coerce
  .date()
  .refine((date) => date <= new Date(), 'Data não pode ser no futuro');

// Data que pode ser futura (para contas a pagar)
export const futureDateSchema = z.coerce.date();

// Texto sanitizado (sem HTML/scripts)
export const safeTextSchema = z
  .string()
  .max(500, 'Texto muito longo')
  .transform((val) => val.replace(/<[^>]*>/g, '').trim()); // Remove tags HTML

// ===========================================
// AUTH SCHEMAS
// ===========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha obrigatória'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  email: emailSchema,
  password: passwordSchema,
});

// ===========================================
// TRANSACTION SCHEMAS
// ===========================================

export const transactionTypeSchema = z.enum(['expense', 'income'], {
  errorMap: () => ({ message: 'Tipo deve ser "expense" ou "income"' }),
});

export const createTransactionSchema = z.object({
  amount: amountSchema,
  description: safeTextSchema.optional(),
  date: futureDateSchema,
  type: transactionTypeSchema,
  category_id: uuidSchema.optional(),
  paid: z.boolean().optional().default(true),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFiltersSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  type: transactionTypeSchema.optional(),
  category_id: uuidSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ===========================================
// BUDGET SCHEMAS
// ===========================================

export const createBudgetSchema = z.object({
  category_id: uuidSchema,
  amount: amountSchema,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const updateBudgetSchema = z.object({
  amount: amountSchema,
});

export const budgetFiltersSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

// ===========================================
// CHAT SCHEMAS
// ===========================================

export const chatMessageSchema = z.object({
  message: z
    .string()
    .max(2000, 'Mensagem muito longa')
    .optional()
    .transform((val) => val?.trim()),
});

// Para validar respostas JSON dos agentes
export const agentTransactionResponseSchema = z.object({
  success: z.boolean(),
  transaction: z
    .object({
      amount: z.number(),
      type: transactionTypeSchema,
      category: z.string(),
      description: z.string().optional(),
      date: z.string(),
      paid: z.boolean().optional(),
    })
    .optional(),
  confirmation: z.string().optional(),
  error: z.string().optional(),
  needsConfirmation: z.boolean().optional(),
  question: z.string().optional(),
});

export const agentBudgetActionSchema = z.object({
  action: z.literal('create_budgets'),
  budgets: z.array(
    z.object({
      category: z.string(),
      amount: z.number().positive(),
    })
  ),
  confirmation: z.string(),
});

// ===========================================
// MIDDLEWARE DE VALIDAÇÃO
// ===========================================

/**
 * Cria middleware de validação para body
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Cria middleware de validação para query params
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Cria middleware de validação para params (URL)
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'ID inválido',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

export default {
  loginSchema,
  registerSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
  createBudgetSchema,
  updateBudgetSchema,
  budgetFiltersSchema,
  chatMessageSchema,
  validateBody,
  validateQuery,
  validateParams,
};
