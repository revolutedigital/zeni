import { Router } from 'express';
import multer from 'multer';
import pool from '../db/connection.js';
import { authMiddleware } from './auth.js';
import { routeToAgent, executeAgent, extractStateFromResponse } from '../agents/orchestrator.js';
import {
  getConversationState,
  saveConversationState
} from '../services/conversationState.js';
import { trackEvent } from '../services/analytics.js';
import { logger } from '../services/logger.js';
import {
  getSmartContext,
  extractAndSaveFacts,
  formatSmartContextForPrompt
} from '../services/smartMemory.js';
import { getFinancialReaction, analyzeFinancialContext } from '../services/personality.js';
import { prepareDetectiveContext } from '../services/patternAnalyzer.js';
import { prepareDebtContext } from '../services/debtAnalyzer.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  }
});

router.use(authMiddleware);

// Helper: Escapar caracteres especiais de regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper: Extrair JSON robusto de respostas do Claude
function extractJSON(text, actionType = null) {
  if (!text) return null;

  try {
    // Tentar parse direto primeiro
    return JSON.parse(text);
  } catch (e) {
    // Não é JSON puro, vamos extrair
  }

  // Remover markdown code blocks
  let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();

  // Se procurando uma ação específica, buscar o objeto com essa ação
  if (actionType) {
    // Escapar actionType para prevenir ReDoS
    const safeActionType = escapeRegex(actionType);
    const regex = new RegExp(`\\{[\\s\\S]*?"action"[\\s\\S]*?"${safeActionType}"[\\s\\S]*?\\}`, 'm');
    const match = cleaned.match(regex);
    if (match) {
      cleaned = match[0];
    }
  } else {
    // Buscar qualquer objeto JSON
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      cleaned = match[0];
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    logger.debug(`[extractJSON] Failed to parse: ${e.message}`);
    return null;
  }
}

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

  // NOVO: Buscar goals/objetivos do usuário (para agente PLANNER)
  const goalsResult = await pool.query(`
    SELECT
      id,
      name,
      description,
      target_amount,
      current_amount,
      deadline,
      priority,
      category,
      status,
      CASE
        WHEN target_amount > 0 THEN ROUND((current_amount / target_amount) * 100, 1)
        ELSE 0
      END as progress_percent,
      CASE
        WHEN deadline IS NOT NULL THEN
          (deadline - CURRENT_DATE)
        ELSE NULL
      END as days_remaining
    FROM goals
    WHERE user_id = $1 AND status = 'active'
    ORDER BY priority DESC, deadline ASC NULLS LAST
  `, [userId]);

  const expenses = parseFloat(expensesResult.rows[0]?.total) || 0;
  const income = parseFloat(incomeResult.rows[0]?.total) || 0;
  const totalBudget = parseFloat(budgetResult.rows[0]?.total) || 0;
  const remaining = totalBudget - expenses;

  // Calcular margem disponível para objetivos (receita - despesas)
  const availableMargin = income - expenses;
  // Total já comprometido com goals (soma de monthly_contribution de todos os goals)
  const existingCommitments = goalsResult.rows.reduce((sum, g) => {
    if (g.deadline && g.days_remaining > 0) {
      const monthsRemaining = Math.max(Math.ceil(g.days_remaining / 30), 1);
      const remainingAmount = (parseFloat(g.target_amount) || 0) - (parseFloat(g.current_amount) || 0);
      return sum + (remainingAmount / monthsRemaining);
    }
    return sum;
  }, 0);

  // NOVO: Buscar transações dos últimos 6 meses (para agentes DETECTIVE e DEBT_DESTROYER)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const last6MonthsTransactions = await pool.query(`
    SELECT
      t.id,
      t.amount,
      t.description,
      t.date,
      t.type,
      t.paid,
      c.name as category
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
      AND t.date >= $2
    ORDER BY t.date DESC
  `, [userId, sixMonthsAgo.toISOString().split('T')[0]]);

  // Preparar contextos especializados para novos agentes
  let detectiveContext = null;
  let debtContext = null;

  // Só preparar se houver transações suficientes
  if (last6MonthsTransactions.rows.length >= 20) {
    try {
      detectiveContext = prepareDetectiveContext(last6MonthsTransactions.rows);
    } catch (err) {
      logger.warn('[Chat] Erro ao preparar contexto Detective:', err.message);
    }
  }

  try {
    debtContext = prepareDebtContext(last6MonthsTransactions.rows, income, expenses);
  } catch (err) {
    logger.warn('[Chat] Erro ao preparar contexto Debt:', err.message);
  }

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
    budgetAlerts,
    // NOVO: Dados para agente PLANNER
    goals: goalsResult.rows.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      progressPercent: parseFloat(g.progress_percent),
      deadline: g.deadline,
      daysRemaining: g.days_remaining ? Math.floor(g.days_remaining) : null,
      priority: g.priority,
      category: g.category,
      status: g.status
    })),
    monthlyIncome: income,
    availableMargin,
    existingCommitments,
    // NOVO: Dados para agente DETECTIVE
    detectiveAnalysis: detectiveContext,
    // NOVO: Dados para agente DEBT_DESTROYER
    debtAnalysis: debtContext
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

    const yExpenses = parseFloat(yearlyExpenses.rows[0]?.total) || 0;
    const yIncome = parseFloat(yearlyIncome.rows[0]?.total) || 0;
    context.yearlyData = {
      year: targetYear,
      totalExpenses: yExpenses,
      totalIncome: yIncome,
      balance: yIncome - yExpenses,
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

    // INTEGRAÇÃO: Smart Memory - usa contexto inteligente quando histórico é grande
    const smartContext = await getSmartContext(req.userId, message);
    let conversationHistory = smartContext.messages;

    // Adicionar contexto inteligente ao prompt (fatos do usuário + resumo)
    let smartContextStr = formatSmartContextForPrompt(smartContext);

    // INTEGRAÇÃO: Personality - analisar contexto financeiro para reações
    const financialMood = analyzeFinancialContext({
      income: context.income,
      expenses: context.expenses,
      budget: context.totalBudget,
      previousExpenses: context.expenses * 0.9 // Estimativa para comparação
    });

    logger.debug({ smartContextLength: smartContext.messages.length, hasSummary: !!smartContext.summary }, 'Smart context loaded');

    // NOVO: Buscar estado da conversa para continuidade
    const conversationState = await getConversationState(req.userId);
    logger.debug('[Chat] Estado da conversa:', JSON.stringify(conversationState));

    // Preparar contexto para o agente
    const agentContext = {
      data: context,
      hasImage,
      budgetAlerts: context.budgetAlerts,
      conversationHistory,
      // INTEGRAÇÃO: Smart Memory - adiciona contexto inteligente
      smartContextStr,
      userFacts: smartContext.facts,
      // INTEGRAÇÃO: Personality - adiciona contexto emocional
      financialMood: financialMood.context
    };

    if (hasImage) {
      agentContext.imageBase64 = req.file.buffer.toString('base64');
      agentContext.mimeType = req.file.mimetype;
    }

    // Determinar agente (agora com estado de conversa)
    const agent = routeToAgent(message || '', agentContext, conversationHistory, conversationState);

    // Executar agente (com estado para instruções adicionais)
    let response = await executeAgent(agent, message || 'Analise esta imagem', agentContext, conversationHistory, conversationState);

    // NOVO: Extrair e salvar novo estado baseado na resposta
    const newState = extractStateFromResponse(response, agent);
    newState.turnCount = (conversationState?.turnCount || 0) + 1;
    await saveConversationState(req.userId, newState);
    logger.debug('[Chat] Novo estado salvo:', JSON.stringify(newState));

    // Salvar no histórico
    await pool.query(
      'INSERT INTO chat_history (user_id, role, content, agent) VALUES ($1, $2, $3, $4)',
      [req.userId, 'user', message || '[imagem]', null]
    );
    await pool.query(
      'INSERT INTO chat_history (user_id, role, content, agent) VALUES ($1, $2, $3, $4)',
      [req.userId, 'assistant', response, agent]
    );

    // Track analytics event
    trackEvent(req.userId, 'chat_message', {
      agent,
      hasImage,
      messageLength: message?.length || 0
    });

    // INTEGRAÇÃO: Smart Memory - extrair e salvar fatos importantes da conversa
    extractAndSaveFacts(req.userId, message || '', response).catch(err => {
      logger.warn({ err }, 'Failed to extract facts from conversation');
    });

    // Se foi registro, tentar parsear e salvar transação
    if (agent === 'registrar' || agent === 'registrar_vision') {
      try {
        // Tentar extrair JSON robusto (suporta markdown code blocks, texto antes/depois)
        const parsed = extractJSON(response) || JSON.parse(response);
        if (parsed.success && parsed.transaction) {
          // Buscar category_id
          const catResult = await pool.query(
            'SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1',
            [parsed.transaction.category]
          );
          const categoryId = catResult.rows[0]?.id || null;

          // Validar amount
          const amount = parseFloat(parsed.transaction.amount);
          if (!amount || amount <= 0 || amount > 999999999) {
            throw new Error('Valor inválido para transação');
          }
          parsed.transaction.amount = amount;

          // Resolver data - substituir placeholders não resolvidos
          let txDate = parsed.transaction.date || new Date().toISOString().split('T')[0];
          if (txDate.includes('DATA') || txDate.includes('{')) {
            txDate = new Date().toISOString().split('T')[0];
          }

          // Salvar transação (com DB transaction para recorrentes)
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await client.query(`
              INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, paid)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              req.userId,
              parsed.transaction.amount,
              parsed.transaction.description,
              txDate,
              parsed.transaction.type,
              categoryId,
              hasImage ? 'photo' : 'text',
              parsed.transaction.paid !== undefined ? parsed.transaction.paid : true
            ]);

            // Se é recorrente, criar transações para os próximos 11 meses
            if (parsed.transaction.recurrent || parsed.recurrent) {
              const baseDate = new Date(txDate);
              for (let i = 1; i <= 11; i++) {
                const futureDate = new Date(baseDate);
                futureDate.setMonth(futureDate.getMonth() + i);
                const futureDateStr = futureDate.toISOString().split('T')[0];

                await client.query(`
                  INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, paid)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                  req.userId,
                  parsed.transaction.amount,
                  parsed.transaction.description,
                  futureDateStr,
                  parsed.transaction.type,
                  categoryId,
                  hasImage ? 'photo' : 'text',
                  false
                ]);
              }
              logger.info(`[Chat] ✅ Transação recorrente criada: 12 meses de R$${parsed.transaction.amount}`);
            }
            await client.query('COMMIT');
          } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
          } finally {
            client.release();
          }

          // Substituir resposta JSON pela mensagem de confirmação amigável
          const recurrentMsg = (parsed.transaction.recurrent || parsed.recurrent)
            ? ' (recorrente por 12 meses)'
            : '';
          response = parsed.confirmation || `✅ Transação de R$${parsed.transaction.amount.toFixed(2)} registrada${recurrentMsg}!`;

          // INTEGRAÇÃO: Personality - adicionar reação para transação registrada
          const reaction = getFinancialReaction('firstTransaction');
          if (reaction && Math.random() > 0.7) { // 30% de chance de adicionar reação
            response += `\n\n${reaction.message}`;
          }
        } else if (parsed.success === false && parsed.error) {
          // Resposta de erro estruturada - mostrar a mensagem amigável
          response = parsed.error;
        }
      } catch (e) {
        // Se não conseguiu parsear JSON, tentar extrair a mensagem de confirmação do texto
        const confirmMatch = response.match(/✅[^"}\n]+/);
        if (confirmMatch) {
          response = confirmMatch[0];
        }
        logger.warn('[Chat] Falha ao parsear resposta do registrador:', e.message);
      }
    }

    // Se Planner retornou ação de criar objetivo, executar
    if (agent === 'planner') {
      try {
        const parsed = extractJSON(response, 'create_goal');

        if (parsed?.action === 'create_goal' && parsed.goal) {
          logger.info('[Chat] Planner retornou create_goal, criando objetivo...', parsed.goal);

          // Validar dados obrigatórios
          if (!parsed.goal.name || !parsed.goal.targetAmount) {
            throw new Error('Goal name e targetAmount são obrigatórios');
          }

          // Inserir objetivo no banco
          const insertResult = await pool.query(`
            INSERT INTO goals (user_id, name, description, target_amount, deadline, priority, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, target_amount
          `, [
            req.userId,
            parsed.goal.name,
            parsed.goal.description || null,
            parsed.goal.targetAmount,
            parsed.goal.deadline || null,
            parsed.goal.priority || 'medium',
            parsed.goal.category || 'savings'
          ]);

          const createdGoal = insertResult.rows[0];
          logger.info(`[Chat] ✅ Objetivo criado com ID: ${createdGoal.id}`);

          // Substituir response pela mensagem de confirmação
          response = parsed.message || parsed.confirmation || `🎯 Objetivo "${createdGoal.name}" criado com sucesso! Meta: R$${parseFloat(createdGoal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
          logger.debug('[Chat] Planner response não contém action create_goal');
        }
      } catch (e) {
        logger.error('[Chat] Erro ao processar create_goal:', e);
        // Adicionar mensagem de erro visível ao usuário
        response += '\n\n⚠️ Houve um problema ao salvar o objetivo. Por favor, tente novamente.';
      }
    }

    // Se CFO retornou ação de criar orçamentos, executar
    if (agent === 'cfo') {
      try {
        const parsed = extractJSON(response, 'create_budgets');

        if (parsed?.action === 'create_budgets' && parsed.budgets && Array.isArray(parsed.budgets)) {
          logger.info('[Chat] CFO retornou create_budgets, criando orçamentos...', { count: parsed.budgets.length });

          let createdCount = 0;
          const errors = [];

          for (const budget of parsed.budgets) {
            // Validar dados
            if (!budget.category || !budget.amount) {
              errors.push(`Orçamento inválido: ${JSON.stringify(budget)}`);
              continue;
            }

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
                DO UPDATE SET amount = EXCLUDED.amount
              `, [
                req.userId,
                catResult.rows[0].id,
                budget.amount,
                context.month,
                context.year
              ]);
              logger.info(`[Chat] ✅ Orçamento criado: ${budget.category} = R$${budget.amount}`);
              createdCount++;
            } else {
              errors.push(`Categoria não encontrada: ${budget.category}`);
              logger.warn(`[Chat] Categoria não encontrada: ${budget.category}`);
            }
          }

          logger.info(`[Chat] Total de orçamentos criados: ${createdCount}/${parsed.budgets.length}`);

          // Substituir response pelo texto de confirmação
          if (createdCount > 0) {
            response = parsed.confirmation || parsed.message || `✅ ${createdCount} orçamento(s) criado(s) com sucesso!`;
            if (errors.length > 0) {
              response += `\n\n⚠️ Alguns orçamentos não puderam ser criados: ${errors.join(', ')}`;
            }
          } else {
            response = `⚠️ Não foi possível criar os orçamentos. Erros: ${errors.join(', ')}`;
          }
        } else {
          logger.debug('[Chat] CFO response não contém action create_budgets');
        }
      } catch (e) {
        logger.error('[Chat] Erro ao processar create_budgets:', e);
        // Adicionar mensagem de erro visível ao usuário
        response += '\n\n⚠️ Houve um problema ao salvar os orçamentos. Por favor, tente novamente.';
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
    logger.error('Erro no chat:', error);
    // Stack trace só em desenvolvimento (previne exposição em produção)
    if (process.env.NODE_ENV !== 'production') {
      console.error('DETALHE DO ERRO:', error.message);
      console.error('STACK:', error.stack);
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Histórico de chat
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);

    const result = await pool.query(`
      SELECT * FROM chat_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.userId, limit]);

    res.json(result.rows.reverse());
  } catch (error) {
    logger.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
