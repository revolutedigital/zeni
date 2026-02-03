/**
 * Goal Analyzer Service - Zeni
 *
 * Serviço de análise de viabilidade de objetivos financeiros usando IA
 */

import { callClaude } from './claude.js';
import pool from '../db/connection.js';
import { logger } from './logger.js';

/**
 * Analisa a viabilidade de um objetivo financeiro
 */
export async function analyzeGoalViability(userId, goalData) {
  // Buscar dados financeiros do usuário
  const userData = await getUserFinancialData(userId);

  const prompt = buildAnalysisPrompt(goalData, userData);

  // IMPORTANTE: Usa Sonnet 4 APENAS aqui porque:
  // 1. Análise complexa de viabilidade financeira (score 0-100)
  // 2. Criação de plano de ação detalhado e personalizado
  // 3. Chamado apenas 1x por objetivo (não em toda interação)
  // Todos os outros agentes usam Haiku para economizar 12x no custo
  const response = await callClaude(
    PLANNER_SYSTEM_PROMPT,
    prompt,
    'claude-sonnet-4-20250514',
    []
  );

  // Parsear resposta da IA
  try {
    const parsed = parseAnalysisResponse(response);
    return parsed;
  } catch (error) {
    logger.error('[GoalAnalyzer] Parse error:', error);
    return {
      viabilityScore: 50,
      analysis: response,
      actionPlan: [],
      recommendation: 'Não foi possível gerar análise detalhada. Revise os dados.'
    };
  }
}

/**
 * Busca dados financeiros do usuário para análise
 */
async function getUserFinancialData(userId) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Renda mensal e perfil
  const userResult = await pool.query(`
    SELECT monthly_income, onboarding_profile
    FROM users WHERE id = $1
  `, [userId]);

  const user = userResult.rows[0] || {};
  const monthlyIncome = parseFloat(user.monthly_income || 0) || 0;
  const profile = user.onboarding_profile || {};

  // Gastos dos últimos 3 meses
  const expensesResult = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM date) as month,
      SUM(amount) as total
    FROM transactions
    WHERE user_id = $1
      AND type = 'expense'
      AND date >= NOW() - INTERVAL '3 months'
    GROUP BY EXTRACT(MONTH FROM date)
    ORDER BY month DESC
  `, [userId]);

  const monthlyExpenses = expensesResult.rows.map(r => parseFloat(r.total));
  const avgMonthlyExpense = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
    : 0;

  // Orçamentos atuais
  const budgetsResult = await pool.query(`
    SELECT SUM(amount) as total
    FROM budgets
    WHERE user_id = $1 AND month = $2 AND year = $3
  `, [userId, month, year]);

  const totalBudget = parseFloat(budgetsResult.rows[0]?.total) || 0;

  // Gastos fixos do perfil de onboarding
  const fixedExpenses = profile.totalFixed || 0;

  // Objetivos existentes
  const goalsResult = await pool.query(`
    SELECT name, target_amount, current_amount, monthly_contribution, status
    FROM goals
    WHERE user_id = $1 AND status = 'active'
  `, [userId]);

  const existingGoals = goalsResult.rows.map(g => ({
    name: g.name,
    target: parseFloat(g.target_amount),
    current: parseFloat(g.current_amount),
    monthlyContribution: parseFloat(g.monthly_contribution) || 0
  }));

  const totalMonthlyContributions = existingGoals.reduce(
    (sum, g) => sum + g.monthlyContribution, 0
  );

  // Margem disponível
  const availableMargin = monthlyIncome - avgMonthlyExpense - totalMonthlyContributions;

  return {
    monthlyIncome,
    avgMonthlyExpense,
    fixedExpenses,
    totalBudget,
    availableMargin,
    existingGoals,
    totalMonthlyContributions,
    profile
  };
}

/**
 * Constrói o prompt de análise
 */
function buildAnalysisPrompt(goalData, userData) {
  const { name, targetAmount, deadline, priority, category } = goalData;

  // Calcular meses até o deadline
  let monthsToDeadline = null;
  if (deadline) {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    monthsToDeadline = Math.max(1, Math.ceil(
      (deadlineDate - now) / (1000 * 60 * 60 * 24 * 30)
    ));
  }

  const requiredMonthly = monthsToDeadline
    ? targetAmount / monthsToDeadline
    : null;

  return `
Analise a viabilidade deste objetivo financeiro:

**OBJETIVO:**
- Nome: ${name}
- Valor alvo: R$ ${targetAmount.toLocaleString('pt-BR')}
- Prazo: ${deadline || 'Não definido'} ${monthsToDeadline ? `(${monthsToDeadline} meses)` : ''}
- Prioridade: ${priority || 'média'}
- Categoria: ${category || 'não especificada'}
${requiredMonthly ? `- Contribuição necessária: R$ ${requiredMonthly.toFixed(2)}/mês` : ''}

**SITUAÇÃO FINANCEIRA DO USUÁRIO:**
- Renda mensal: R$ ${userData.monthlyIncome.toLocaleString('pt-BR')}
- Média de gastos mensais: R$ ${userData.avgMonthlyExpense.toLocaleString('pt-BR')}
- Gastos fixos: R$ ${userData.fixedExpenses.toLocaleString('pt-BR')}
- Margem disponível: R$ ${userData.availableMargin.toLocaleString('pt-BR')}
- Já compromete com outros objetivos: R$ ${userData.totalMonthlyContributions.toLocaleString('pt-BR')}/mês

**OUTROS OBJETIVOS ATIVOS:**
${userData.existingGoals.length > 0
    ? userData.existingGoals.map(g =>
      `- ${g.name}: R$ ${g.current.toLocaleString('pt-BR')} de R$ ${g.target.toLocaleString('pt-BR')} (contribuindo R$ ${g.monthlyContribution}/mês)`
    ).join('\n')
    : '- Nenhum objetivo ativo'}

Responda em JSON com esta estrutura:
{
  "viabilityScore": 0-100,
  "viabilityLevel": "easy" | "medium" | "hard" | "very_hard",
  "analysis": "Análise em texto natural (2-3 parágrafos)",
  "monthlyContributionSuggested": number,
  "percentOfMargin": number,
  "actionPlan": [
    {
      "order": 1,
      "action": "Descrição da ação",
      "impact": "Impacto esperado",
      "category": "cut_expense" | "increase_income" | "reallocate" | "habit"
    }
  ],
  "risks": ["risco 1", "risco 2"],
  "recommendation": "Recomendação final em 1-2 frases"
}
`;
}

/**
 * Parseia a resposta da IA
 */
function parseAnalysisResponse(response) {
  // Tentar extrair JSON da resposta
  let jsonStr = response;

  try {
    // Se a resposta tem markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Tentar encontrar objeto JSON na resposta
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // Validar campos obrigatórios
    return {
      viabilityScore: parsed.viabilityScore || 50,
      viabilityLevel: parsed.viabilityLevel || 'medium',
      analysis: parsed.analysis || '',
      monthlyContributionSuggested: parsed.monthlyContributionSuggested || 0,
      percentOfMargin: parsed.percentOfMargin || 0,
      actionPlan: parsed.actionPlan || [],
      risks: parsed.risks || [],
      recommendation: parsed.recommendation || ''
    };
  } catch (err) {
    // Log do erro com amostra da resposta para debugging
    logger.error({ err, responsePreview: response?.substring(0, 200) }, 'Failed to parse goal analysis response');

    // Retornar valores default seguros
    return {
      viabilityScore: 50,
      viabilityLevel: 'medium',
      analysis: 'Não foi possível analisar o objetivo. Tente novamente.',
      monthlyContributionSuggested: 0,
      percentOfMargin: 0,
      actionPlan: [],
      risks: ['Análise indisponível no momento'],
      recommendation: 'Tente novamente mais tarde.'
    };
  }
}

/**
 * Atualiza análise de um objetivo existente
 */
export async function refreshGoalAnalysis(goalId, userId) {
  // Buscar dados do objetivo
  const goalResult = await pool.query(`
    SELECT * FROM goals WHERE id = $1 AND user_id = $2
  `, [goalId, userId]);

  if (goalResult.rows.length === 0) {
    throw new Error('Objetivo não encontrado');
  }

  const goal = goalResult.rows[0];

  // Recalcular com novo valor alvo (meta - já acumulado)
  const remainingAmount = parseFloat(goal.target_amount) - parseFloat(goal.current_amount);

  const analysis = await analyzeGoalViability(userId, {
    name: goal.name,
    targetAmount: remainingAmount,
    deadline: goal.deadline,
    priority: goal.priority,
    category: goal.category
  });

  // Atualizar no banco
  await pool.query(`
    UPDATE goals
    SET
      viability_score = $2,
      action_plan = $3,
      monthly_contribution = $4,
      updated_at = NOW()
    WHERE id = $1
  `, [
    goalId,
    analysis.viabilityScore,
    JSON.stringify(analysis),
    analysis.monthlyContributionSuggested
  ]);

  return analysis;
}

/**
 * Prompt do sistema para o Planner
 */
const PLANNER_SYSTEM_PROMPT = `Você é o Planejador Financeiro da Zeni - especialista em análise de viabilidade de objetivos.

## Sua Missão

Avaliar se um objetivo financeiro é realista e criar um plano de ação personalizado para alcançá-lo.

## Critérios de Viabilidade

**FÁCIL (80-100):** Contribuição necessária < 30% da margem disponível
**MÉDIO (60-79):** Contribuição necessária entre 30-60% da margem
**DIFÍCIL (40-59):** Contribuição necessária entre 60-90% da margem
**MUITO DIFÍCIL (0-39):** Contribuição > 90% da margem ou impossível no prazo

## Princípios do Plano de Ação

1. **Ações concretas:** Não seja vago. "Reduzir gastos" → "Reduzir delivery de R$400 para R$200/mês"
2. **Priorize cortes menos dolorosos:** Assinaturas não usadas, taxas bancárias, etc
3. **Considere aumento de renda:** Freelance, venda de itens, renda passiva
4. **Seja realista:** Não sugira cortar 100% de lazer, isso não é sustentável
5. **Considere outros objetivos:** Se já tem metas, não ignore

## Tom de Comunicação

- Honesto mas encorajador
- Data-driven (use números)
- Sem julgamento moral sobre gastos
- Ofereça alternativas se o objetivo for difícil

## Regra de Ouro

Se a viabilidade for baixa, NÃO diga "desista". Diga:
- "Considere estender o prazo para X meses"
- "Ou reduza o valor alvo para R$ X"
- "Ou busque fonte de renda extra de R$ X/mês"

Sempre deixe o usuário com opções.`;

export default {
  analyzeGoalViability,
  refreshGoalAnalysis
};
