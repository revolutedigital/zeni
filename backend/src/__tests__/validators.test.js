/**
 * Testes dos Schemas de Validação Zod
 */

import {
  loginSchema,
  registerSchema,
  createTransactionSchema,
  createBudgetSchema,
  amountSchema,
  emailSchema,
  chatMessageSchema,
} from '../validators/schemas.js';

describe('Schemas de Validação', () => {
  describe('emailSchema', () => {
    test('aceita email válido', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    test('converte para lowercase', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    test('rejeita email inválido', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    test('rejeita email muito longo', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('amountSchema', () => {
    test('aceita número positivo', () => {
      const result = amountSchema.safeParse(100.50);
      expect(result.success).toBe(true);
      expect(result.data).toBe(100.5);
    });

    test('arredonda para 2 casas decimais', () => {
      const result = amountSchema.safeParse(100.555);
      expect(result.success).toBe(true);
      expect(result.data).toBe(100.56);
    });

    test('rejeita número negativo', () => {
      const result = amountSchema.safeParse(-50);
      expect(result.success).toBe(false);
    });

    test('rejeita zero', () => {
      const result = amountSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    test('rejeita valor muito alto', () => {
      const result = amountSchema.safeParse(9999999999999);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    test('aceita login válido', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '123456',
      });
      expect(result.success).toBe(true);
    });

    test('rejeita sem email', () => {
      const result = loginSchema.safeParse({
        password: '123456',
      });
      expect(result.success).toBe(false);
    });

    test('rejeita sem senha', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    // Senha forte: 12+ chars, maiúscula, minúscula, número, especial
    const strongPassword = 'SenhaForte123!';

    test('aceita registro válido', () => {
      const result = registerSchema.safeParse({
        name: 'João Silva',
        email: 'joao@example.com',
        password: strongPassword,
      });
      expect(result.success).toBe(true);
    });

    test('rejeita nome muito curto', () => {
      const result = registerSchema.safeParse({
        name: 'J',
        email: 'test@example.com',
        password: strongPassword,
      });
      expect(result.success).toBe(false);
    });

    test('rejeita senha muito curta', () => {
      const result = registerSchema.safeParse({
        name: 'João',
        email: 'test@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
    });

    test('rejeita senha sem caractere especial', () => {
      const result = registerSchema.safeParse({
        name: 'João',
        email: 'test@example.com',
        password: 'SenhaForte123',
      });
      expect(result.success).toBe(false);
    });

    test('rejeita senha sem maiúscula', () => {
      const result = registerSchema.safeParse({
        name: 'João',
        email: 'test@example.com',
        password: 'senhafraca123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createTransactionSchema', () => {
    test('aceita transação válida', () => {
      const result = createTransactionSchema.safeParse({
        amount: 150.00,
        description: 'Compras no mercado',
        date: '2025-01-15',
        type: 'expense',
      });
      expect(result.success).toBe(true);
    });

    test('aceita transação mínima', () => {
      const result = createTransactionSchema.safeParse({
        amount: 10,
        date: '2025-01-15',
        type: 'expense',
      });
      expect(result.success).toBe(true);
    });

    test('rejeita tipo inválido', () => {
      const result = createTransactionSchema.safeParse({
        amount: 100,
        date: '2025-01-15',
        type: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    test('aceita income', () => {
      const result = createTransactionSchema.safeParse({
        amount: 5000,
        date: '2025-01-15',
        type: 'income',
        description: 'Salário',
      });
      expect(result.success).toBe(true);
    });

    test('paid default é true', () => {
      const result = createTransactionSchema.safeParse({
        amount: 100,
        date: '2025-01-15',
        type: 'expense',
      });
      expect(result.success).toBe(true);
      expect(result.data.paid).toBe(true);
    });
  });

  describe('createBudgetSchema', () => {
    test('aceita orçamento válido', () => {
      const result = createBudgetSchema.safeParse({
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1500,
        month: 1,
        year: 2025,
      });
      expect(result.success).toBe(true);
    });

    test('rejeita mês inválido', () => {
      const result = createBudgetSchema.safeParse({
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1500,
        month: 13,
        year: 2025,
      });
      expect(result.success).toBe(false);
    });

    test('rejeita ano muito antigo', () => {
      const result = createBudgetSchema.safeParse({
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1500,
        month: 1,
        year: 2019,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatMessageSchema', () => {
    test('aceita mensagem válida', () => {
      const result = chatMessageSchema.safeParse({
        message: 'Como estou esse mês?',
      });
      expect(result.success).toBe(true);
    });

    test('aceita mensagem vazia (para imagens)', () => {
      const result = chatMessageSchema.safeParse({
        message: '',
      });
      expect(result.success).toBe(true);
    });

    test('aceita sem mensagem', () => {
      const result = chatMessageSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('rejeita mensagem muito longa', () => {
      const result = chatMessageSchema.safeParse({
        message: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    test('trim remove espaços', () => {
      const result = chatMessageSchema.safeParse({
        message: '   teste   ',
      });
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('teste');
    });
  });
});

describe('Segurança - Sanitização', () => {
  test('safeTextSchema remove HTML', async () => {
    const { safeTextSchema } = await import('../validators/schemas.js');
    const result = safeTextSchema.safeParse('<script>alert("xss")</script>Hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('alert("xss")Hello');
    expect(result.data).not.toContain('<script>');
  });
});
