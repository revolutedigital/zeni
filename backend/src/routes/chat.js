import { Router } from 'express';
import multer from 'multer';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { routeToAgent, executeAgent, extractStateFromResponse } from '../agents/orchestrator.js';
import {
  getConversationState,
  saveConversationState
} from '../services/conversationState.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// Detectar se a pergunta menciona um ano ou período específico
function detectPeriodFromMessage(message) {
  const msg = message?.toLowerCase() || '';

  // Detectar ano específico (2020-2030)
  const yearMatch = msg.match(/\b(20[2-3][0-9])\b/);
  const requestedYear = yearMatch ? parseInt(yearMatch[1]) : null;

  // Detectar se é pergunta sobre "total" ou "ano todo"
  const isYearlyQuery = /\b(ano|total|anual|tudo|todos?)\b/.test(msg) && requestedYear;

  return { requestedYear, isYearlyQuery };
}

// Buscar contexto do usuário para os agentes
async function getUserContext(userId, message = '') {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Detectar se pergunta sobre período específico
  const { requestedYear, isYearlyQuery } = detectPeriodFromMessage(message);

  // Total de despesas do mês
  const expensesResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = $1
      AND EXTRACT(MONTH FROM date) = $2
      AND EXTRACT(YEAR FROM date) = $3
      AND type = 'expense'
  `, [userId, month, year]);

  // Total de receitas do mês
  const incomeResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = $1
      AND EXTRACT(MONTH FROM date) = $2
      AND EXTRACT(YEAR FROM date) = $3
      AND type = 'income'
  `, [userId, month, year]);

  // Total orçado no mês
  const budgetResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM budgets
    WHERE user_id = $1
      AND month = $2
      AND year = $3
  `, [userId, month, year]);

  // Gastos por categoria com orçamento
  const byCategory = await pool.query(`
    SELECT
      c.name,
      COALESCE(SUM(t.amount), 0) as spent,
      COALESCE(b.amount, 0) as budget,
      CASE
        WHEN b.amount > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / b.amount) * 100)
        ELSE 0
      END as percent_used
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.user_id = $1
      AND EXTRACT(MONTH FROM t.date) = $2
      AND EXTRACT(YEAR FROM t.date) = $3
      AND t.type = 'expense'
    LEFT JOIN budgets b ON b.category_id = c.id
      AND b.user_id = $1
      AND b.month = $2
      AND b.year = $3
    WHERE c.type IN ('expense', 'both')
    GROUP BY c.name, b.amount
    HAVING COALESCE(SUM(t.amount), 0) > 0 OR COALESCE(b.amount, 0) > 0
    ORDER BY COALESCE(SUM(t.amount), 0) DESC
  `, [userId, month, year]);

  // Últimas transações
  const recent = await pool.query(`
    SELECT t.amount, t.description, t.date, t.type, c.name as category, t.paid
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 10
  `, [userId]);

  const expenses = parseFloat(expensesResult.rows[0].total);
  const income = parseFloat(incomeResult.rows[0].total);
  const totalBudget = parseFloat(budgetResult.rows[0].total);
  const remaining = totalBudget - expenses;

  // Alertas de orçamento estourado
  const budgetAlerts = byCategory.rows
    .filter(row => row.budget > 0 && parseFloat(row.spent) > parseFloat(row.budget))
    .map(row => ({
      category: row.name,
      spent: parseFloat(row.spent),
      budget: parseFloat(row.budget),
      over: parseFloat(row.spent) - parseFloat(row.budget)
    }));

  // Formatar byCategory para incluir percentUsed
  const formattedByCategory = byCategory.rows.map(row => ({
    name: row.name,
    spent: parseFloat(row.spent),
    budget: parseFloat(row.budget),
    percentUsed: parseInt(row.percent_used) || 0,
    remaining: parseFloat(row.budget) - parseFloat(row.spent)
  }));

  // Construir contexto base
  const context = {
    month,
    year,
    totalBudget,
    expenses,
    income,
    balance: income - expenses,
    remaining,
    percentUsed: totalBudget > 0 ? Math.round((expenses / totalBudget) * 100) : 0,
    byCategory: formattedByCategory,
    recentTransactions: recent.rows,
    budgetAlerts
  };

  // Se perguntou sobre um ano específico, adicionar dados históricos
  if (requestedYear || isYearlyQuery) {
    const targetYear = requestedYear || year;

    // Total do ano inteiro
    const yearlyExpenses = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM date) = $2
        AND type = 'expense'
    `, [userId, targetYear]);

    const yearlyIncome = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM date) = $2
        AND type = 'income'
    `, [userId, targetYear]);

    // Gastos por categoria no ano
    const yearlyByCategory = await pool.query(`
      SELECT
        c.name,
        COALESCE(SUM(t.amount), 0) as spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.user_id = $1
        AND EXTRACT(YEAR FROM t.date) = $2
        AND t.type = 'expense'
      WHERE c.type IN ('expense', 'both')
      GROUP BY c.name
      HAVING COALESCE(SUM(t.amount), 0) > 0
      ORDER BY COALESCE(SUM(t.amount), 0) DESC
    `, [userId, targetYear]);

    // Gastos por mês no ano
    const monthlyBreakdown = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM date) as month,
        COALESCE(SUM(amount), 0) as expenses
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM date) = $2
        AND type = 'expense'
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `, [userId, targetYear]);

    context.yearlyData = {
      year: targetYear,
      totalExpenses: parseFloat(yearlyExpenses.rows[0].total),
      totalIncome: parseFloat(yearlyIncome.rows[0].total),
      balance: parseFloat(yearlyIncome.rows[0].total) - parseFloat(yearlyExpenses.rows[0].total),
      byCategory: yearlyByCategory.rows.map(row => ({
        name: row.name,
        spent: parseFloat(row.spent)
      })),
      byMonth: monthlyBreakdown.rows.map(row => ({
        month: parseInt(row.month),
        expenses: parseFloat(row.expenses)
      }))
    };
  }

  return context;
}

// Chat com IA
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { message } = req.body;
    const hasImage = !!req.file;

    // Buscar contexto (passando a mensagem para detectar período)
    const context = await getUserContext(req.userId, message);

    // Buscar histórico recente da conversa para manter contexto
    const historyResult = await pool.query(`
      SELECT role, content FROM chat_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.userId]);

    // Reverter para ordem cronológica (mais antiga primeiro)
    const conversationHistory = historyResult.rows
      .reverse()
      .map(row => ({ role: row.role, content: row.content }));

    // NOVO: Buscar estado da conversa para continuidade
    const conversationState = await getConversationState(req.userId);
    console.log('[Chat] Estado da conversa:', JSON.stringify(conversationState));

    // Preparar contexto para o agente
    const agentContext = {
      data: context,
      hasImage,
      budgetAlerts: context.budgetAlerts,
      conversationHistory
    };

    if (hasImage) {
      agentContext.imageBase64 = req.file.buffer.toString('base64');
      agentContext.mimeType = req.file.mimetype;
    }

    // Determinar agente (agora com estado de conversa)
    const agent = routeToAgent(message || '', agentContext, conversationHistory, conversationState);

    // Executar agente (com estado para instruções adicionais)
    const response = await executeAgent(agent, message || 'Analise esta imagem', agentContext, conversationHistory, conversationState);

    // NOVO: Extrair e salvar novo estado baseado na resposta
    const newState = extractStateFromResponse(response, agent);
    newState.turnCount = (conversationState?.turnCount || 0) + 1;
    await saveConversationState(req.userId, newState);
    console.log('[Chat] Novo estado salvo:', JSON.stringify(newState));

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
            INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, paid)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            req.userId,
            parsed.transaction.amount,
            parsed.transaction.description,
            parsed.transaction.date,
            parsed.transaction.type,
            categoryId,
            hasImage ? 'photo' : 'text',
            parsed.transaction.paid !== undefined ? parsed.transaction.paid : true
          ]);
        }
      } catch (e) {
        // Não era JSON válido, só retorna a resposta
      }
    }

    // Se CFO retornou ação de criar orçamentos, executar
    if (agent === 'cfo') {
      try {
        const parsed = JSON.parse(response);
        if (parsed.action === 'create_budgets' && parsed.budgets) {
          console.log('[Chat] CFO retornou create_budgets, criando orçamentos...');

          for (const budget of parsed.budgets) {
            // Buscar category_id pelo nome
            const catResult = await pool.query(
              'SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1',
              [budget.category]
            );

            if (catResult.rows[0]) {
              // Inserir ou atualizar orçamento
              await pool.query(`
                INSERT INTO budgets (user_id, category_id, amount, month, year)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id, category_id, month, year)
                DO UPDATE SET amount = $3
              `, [
                req.userId,
                catResult.rows[0].id,
                budget.amount,
                context.month,
                context.year
              ]);
              console.log(`[Chat] Orçamento criado: ${budget.category} = R$${budget.amount}`);
            } else {
              console.warn(`[Chat] Categoria não encontrada: ${budget.category}`);
            }
          }

          // Substituir response pelo texto de confirmação
          response = parsed.confirmation || parsed.message || 'Orçamentos criados com sucesso!';
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
        totalBudget: context.totalBudget,
        expenses: context.expenses,
        remaining: context.remaining,
        percentUsed: context.percentUsed,
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
