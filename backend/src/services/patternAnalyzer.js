// Pattern Analyzer - Detecta padrões, anomalias e oportunidades de economia
import { logger } from './logger.js';

/**
 * Identifica cobranças recorrentes (assinaturas, planos)
 * @param {Array} transactions - Transações dos últimos 6-12 meses
 * @returns {Array} - Lista de cobranças recorrentes
 */
export function identifyRecurringCharges(transactions) {
  if (!transactions || transactions.length === 0) return [];

  // Agrupar por descrição similar e valor similar
  const groups = {};

  transactions.forEach(t => {
    if (t.type !== 'expense') return;

    // Normalizar descrição (lowercase, remover números/datas)
    const normalized = t.description
      .toLowerCase()
      .replace(/\d+/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();

    const key = `${normalized}_${Math.round(t.amount / 10) * 10}`; // Agrupa valores próximos (±10)

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(t);
  });

  // Filtrar grupos com 3+ ocorrências (provável recorrência)
  const recurring = [];

  Object.entries(groups).forEach(([key, transactions]) => {
    if (transactions.length >= 3) {
      // Calcular frequência média (em dias)
      const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a - b);
      const intervals = [];

      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        intervals.push(diffDays);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Determinar frequência
      let frequency = 'unknown';
      if (avgInterval >= 25 && avgInterval <= 35) frequency = 'monthly';
      else if (avgInterval >= 85 && avgInterval <= 95) frequency = 'quarterly';
      else if (avgInterval >= 355 && avgInterval <= 375) frequency = 'yearly';
      else if (avgInterval >= 6 && avgInterval <= 8) frequency = 'weekly';

      if (frequency !== 'unknown') {
        recurring.push({
          description: transactions[0].description,
          amount: transactions[0].amount,
          frequency,
          occurrences: transactions.length,
          lastSeen: transactions[transactions.length - 1].date,
          avgInterval: Math.round(avgInterval),
          transactions: transactions.slice(0, 5) // Limita a 5 exemplos
        });
      }
    }
  });

  return recurring.sort((a, b) => b.amount - a.amount);
}

/**
 * Calcula gastos médios por dia da semana
 * @param {Array} transactions
 * @returns {Object} - Média por dia da semana (0=dom, 6=sáb)
 */
export function calculateDayOfWeekPatterns(transactions) {
  const byDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  transactions.forEach(t => {
    if (t.type !== 'expense') return;
    const dayOfWeek = new Date(t.date).getDay();
    byDay[dayOfWeek].push(t.amount);
  });

  const result = {};
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  Object.entries(byDay).forEach(([day, amounts]) => {
    if (amounts.length > 0) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const total = amounts.reduce((a, b) => a + b, 0);

      result[dayNames[day]] = {
        dayOfWeek: parseInt(day),
        average: Math.round(avg * 100) / 100,
        total: Math.round(total * 100) / 100,
        count: amounts.length
      };
    }
  });

  return result;
}

/**
 * Detecta anomalias (gastos muito acima da média)
 * @param {Array} transactions
 * @param {Number} threshold - Múltiplo do desvio padrão (default: 2)
 * @returns {Array} - Transações anômalas
 */
export function detectAnomalies(transactions, threshold = 2) {
  if (!transactions || transactions.length < 10) return [];

  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return [];

  // Calcular média e desvio padrão
  const amounts = expenses.map(t => t.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  const squaredDiffs = amounts.map(a => Math.pow(a - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Encontrar valores acima de threshold * stdDev
  const anomalies = expenses.filter(t => {
    return t.amount > (mean + threshold * stdDev);
  });

  return anomalies.map(a => ({
    ...a,
    deviation: stdDev > 0 ? ((a.amount - mean) / stdDev).toFixed(2) : '0',
    percentAboveMean: mean > 0 ? (((a.amount - mean) / mean) * 100).toFixed(0) : '0'
  }));
}

/**
 * Analisa tendências de crescimento/redução por categoria
 * @param {Array} transactions
 * @param {Number} months - Número de meses para análise (default: 3)
 * @returns {Array} - Categorias com tendências
 */
export function analyzeTrends(transactions, months = 3) {
  if (!transactions || transactions.length === 0) return [];

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

  // Filtrar transações dos últimos X meses
  const recentTransactions = transactions.filter(t => {
    return new Date(t.date) >= startDate && t.type === 'expense';
  });

  // Agrupar por categoria e mês
  const byCategory = {};

  recentTransactions.forEach(t => {
    const category = t.category || 'Outros';
    const monthKey = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM

    if (!byCategory[category]) {
      byCategory[category] = {};
    }

    if (!byCategory[category][monthKey]) {
      byCategory[category][monthKey] = 0;
    }

    byCategory[category][monthKey] += t.amount;
  });

  // Calcular tendências
  const trends = [];

  Object.entries(byCategory).forEach(([category, monthlyData]) => {
    const months = Object.keys(monthlyData).sort();
    if (months.length < 2) return; // Precisa de pelo menos 2 meses

    const amounts = months.map(m => monthlyData[m]);

    // Calcular variação do primeiro para o último mês
    const firstMonth = amounts[0];
    const lastMonth = amounts[amounts.length - 1];
    const percentChange = ((lastMonth - firstMonth) / firstMonth) * 100;

    // Só reportar mudanças significativas (> 30%)
    if (Math.abs(percentChange) > 30) {
      trends.push({
        category,
        trend: percentChange > 0 ? 'increasing' : 'decreasing',
        percentChange: Math.round(percentChange),
        firstMonthAmount: Math.round(firstMonth),
        lastMonthAmount: Math.round(lastMonth),
        monthsAnalyzed: months.length,
        months: months.map((m, i) => ({ month: m, amount: Math.round(amounts[i]) }))
      });
    }
  });

  return trends.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
}

/**
 * Calcula economia potencial de assinaturas
 * @param {Array} recurring - Cobranças recorrentes
 * @param {Number} cancelCount - Quantas cancelar (default: 1)
 * @returns {Object} - Economia potencial
 */
export function calculatePotentialSavings(recurring, cancelCount = 1) {
  if (!recurring || recurring.length === 0) {
    return { monthly: 0, yearly: 0 };
  }

  // Ordenar por valor (maior para menor)
  const sorted = [...recurring].sort((a, b) => b.amount - a.amount);

  // Pegar as N maiores
  const toCancel = sorted.slice(0, Math.min(cancelCount, sorted.length));

  const monthlySavings = toCancel.reduce((sum, item) => {
    if (item.frequency === 'monthly') return sum + item.amount;
    if (item.frequency === 'quarterly') return sum + (item.amount / 3);
    if (item.frequency === 'yearly') return sum + (item.amount / 12);
    return sum;
  }, 0);

  return {
    monthly: Math.round(monthlySavings * 100) / 100,
    yearly: Math.round(monthlySavings * 12 * 100) / 100,
    items: toCancel
  };
}

/**
 * Analisa sazonalidade (meses com gastos consistentemente altos)
 * @param {Array} transactions - Transações de múltiplos anos
 * @returns {Object} - Padrões sazonais detectados
 */
export function analyzeSeasonality(transactions) {
  if (!transactions || transactions.length < 100) return null;

  // Agrupar por mês (independente do ano)
  const byMonth = {};

  transactions.forEach(t => {
    if (t.type !== 'expense') return;

    const month = new Date(t.date).getMonth(); // 0-11

    if (!byMonth[month]) {
      byMonth[month] = [];
    }

    byMonth[month].push(t.amount);
  });

  // Calcular média por mês
  const monthlyAverages = {};
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  Object.entries(byMonth).forEach(([month, amounts]) => {
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const total = amounts.reduce((a, b) => a + b, 0);

    monthlyAverages[monthNames[month]] = {
      average: Math.round(avg * 100) / 100,
      total: Math.round(total * 100) / 100,
      count: amounts.length
    };
  });

  // Encontrar mês mais caro
  const overall = transactions.filter(t => t.type === 'expense').map(t => t.amount);
  const overallAvg = overall.reduce((a, b) => a + b, 0) / overall.length;

  const expensive = Object.entries(monthlyAverages)
    .filter(([month, data]) => data.average > overallAvg * 1.2) // 20% acima da média
    .sort((a, b) => b[1].average - a[1].average);

  if (expensive.length === 0) return null;

  return {
    expensiveMonths: expensive.map(([month, data]) => ({
      month,
      ...data,
      percentAboveAverage: Math.round(((data.average - overallAvg) / overallAvg) * 100)
    })),
    overallAverage: Math.round(overallAvg * 100) / 100
  };
}

/**
 * Prepara contexto completo para o agente DETECTIVE
 * @param {Array} transactions
 * @returns {Object} - Contexto rico para análise
 */
export function prepareDetectiveContext(transactions) {
  logger.debug('[PatternAnalyzer] Preparando contexto para Detective');

  return {
    recurringCharges: identifyRecurringCharges(transactions),
    dayOfWeekPatterns: calculateDayOfWeekPatterns(transactions),
    anomalies: detectAnomalies(transactions, 2),
    trends: analyzeTrends(transactions, 3),
    seasonality: analyzeSeasonality(transactions)
  };
}

export default {
  identifyRecurringCharges,
  calculateDayOfWeekPatterns,
  detectAnomalies,
  analyzeTrends,
  calculatePotentialSavings,
  analyzeSeasonality,
  prepareDetectiveContext
};
