import { Router } from 'express';
import multer from 'multer';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { routeToAgent, executeAgent } from '../agents/orchestrator.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// Buscar contexto do usuário para os agentes
async function getUserContext(userId) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Resumo do mês
  const summary = await pool.query(`
    SELECT
      type,
      SUM(amount) as total
    FROM transactions
    WHERE user_id = $1
      AND EXTRACT(MONTH FROM date) = $2
      AND EXTRACT(YEAR FROM date) = $3
    GROUP BY type
  `, [userId, month, year]);

  // Gastos por categoria
  const byCategory = await pool.query(`
    SELECT
      c.name,
      SUM(t.amount) as spent,
      b.amount as budget
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    LEFT JOIN budgets b ON b.category_id = c.id AND b.user_id = t.user_id AND b.month = $2 AND b.year = $3
    WHERE t.user_id = $1
      AND EXTRACT(MONTH FROM t.date) = $2
      AND EXTRACT(YEAR FROM t.date) = $3
      AND t.type = 'expense'
    GROUP BY c.name, b.amount
  `, [userId, month, year]);

  // Últimas transações
  const recent = await pool.query(`
    SELECT t.amount, t.description, t.date, t.type, c.name as category
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 10
  `, [userId]);

  // Alertas de orçamento estourado
  const budgetAlerts = byCategory.rows
    .filter(row => row.budget && parseFloat(row.spent) > parseFloat(row.budget))
    .map(row => ({
      category: row.name,
      spent: parseFloat(row.spent),
      budget: parseFloat(row.budget),
      over: parseFloat(row.spent) - parseFloat(row.budget)
    }));

  const income = summary.rows.find(r => r.type === 'income')?.total || 0;
  const expenses = summary.rows.find(r => r.type === 'expense')?.total || 0;

  return {
    month,
    year,
    income: parseFloat(income),
    expenses: parseFloat(expenses),
    balance: parseFloat(income) - parseFloat(expenses),
    byCategory: byCategory.rows,
    recentTransactions: recent.rows,
    budgetAlerts
  };
}

// Chat com IA
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { message } = req.body;
    const hasImage = !!req.file;

    // Buscar contexto
    const context = await getUserContext(req.userId);

    // Preparar contexto para o agente
    const agentContext = {
      data: context,
      hasImage,
      budgetAlerts: context.budgetAlerts
    };

    if (hasImage) {
      agentContext.imageBase64 = req.file.buffer.toString('base64');
      agentContext.mimeType = req.file.mimetype;
    }

    // Determinar agente
    const agent = routeToAgent(message || '', agentContext);

    // Executar agente
    const response = await executeAgent(agent, message || 'Analise esta imagem', agentContext);

    // Salvar no histórico
    await pool.query(
      'INSERT INTO chat_history (user_id, role, content, agent) VALUES ($1, $2, $3, $4)',
      [req.userId, 'user', message || '[imagem]', null]
    );
    await pool.query(
      'INSERT INTO chat_history (user_id, role, content, agent) VALUES ($1, $2, $3, $4)',
      [req.userId, 'assistant', response, agent]
    );

    // Se foi registro, tentar parsear e salvar transação
    if (agent === 'registrar' || agent === 'registrar_vision') {
      try {
        const parsed = JSON.parse(response);
        if (parsed.success && parsed.transaction) {
          // Buscar category_id
          const catResult = await pool.query(
            'SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1',
            [parsed.transaction.category]
          );
          const categoryId = catResult.rows[0]?.id;

          // Salvar transação
          await pool.query(`
            INSERT INTO transactions (user_id, amount, description, date, type, category_id, source)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            req.userId,
            parsed.transaction.amount,
            parsed.transaction.description,
            parsed.transaction.date,
            parsed.transaction.type,
            categoryId,
            hasImage ? 'photo' : 'text'
          ]);
        }
      } catch (e) {
        // Não era JSON válido, só retorna a resposta
      }
    }

    res.json({
      agent,
      response,
      context: {
        month: context.month,
        year: context.year,
        expenses: context.expenses,
        budgetAlerts: context.budgetAlerts
      }
    });
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Histórico de chat
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT * FROM chat_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.userId, limit]);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
