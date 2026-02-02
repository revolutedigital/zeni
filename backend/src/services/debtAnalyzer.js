// Debt Analyzer - Analisa dívidas e calcula estratégias de quitação

/**
 * Identifica dívidas das transações (juros, empréstimos, cartões)
 * @param {Array} transactions
 * @returns {Array} - Lista de dívidas detectadas
 */
export function identifyDebts(transactions) {
  if (!transactions || transactions.length === 0) return [];

  const debtKeywords = [
    'cartão', 'cartao', 'fatura', 'nubank', 'c6', 'itaú', 'bradesco',
    'empréstimo', 'emprestimo', 'financiamento', 'parcela',
    'juros', 'multa', 'atraso'
  ];

  const debts = transactions.filter(t => {
    if (t.type !== 'expense') return false;

    const desc = t.description.toLowerCase();
    return debtKeywords.some(keyword => desc.includes(keyword));
  });

  return debts;
}

/**
 * Calcula estratégia de quitação Snowball vs Avalanche
 * @param {Array} debts - Lista de dívidas com {amount, interestRate, minimumPayment}
 * @param {Number} availableMargin - Dinheiro disponível por mês
 * @returns {Object} - Comparação das duas estratégias
 */
export function calculatePayoffStrategies(debts, availableMargin) {
  if (!debts || debts.length === 0 || availableMargin <= 0) {
    return null;
  }

  // MÉTODO SNOWBALL: Menor saldo primeiro
  const snowball = simulatePayoff([...debts].sort((a, b) => a.amount - b.amount), availableMargin);

  // MÉTODO AVALANCHE: Maior juros primeiro
  const avalanche = simulatePayoff([...debts].sort((a, b) => b.interestRate - a.interestRate), availableMargin);

  return {
    snowball: {
      ...snowball,
      name: 'Snowball',
      description: 'Motivação psicológica - vitórias rápidas'
    },
    avalanche: {
      ...avalanche,
      name: 'Avalanche',
      description: 'Matemático - menor custo total'
    },
    recommendation: avalanche.totalInterest < snowball.totalInterest ? 'avalanche' : 'snowball',
    savings: Math.abs(avalanche.totalInterest - snowball.totalInterest)
  };
}

/**
 * Simula quitação de dívidas
 * @param {Array} sortedDebts - Dívidas já ordenadas
 * @param {Number} availableMargin
 * @returns {Object} - Resultado da simulação
 */
function simulatePayoff(sortedDebts, availableMargin) {
  const debts = sortedDebts.map(d => ({ ...d })); // Clone
  let month = 0;
  let totalInterestPaid = 0;

  const timeline = [];

  while (debts.some(d => d.amount > 0)) {
    month++;
    if (month > 360) break; // Limite de 30 anos

    let remainingMargin = availableMargin;

    // Aplicar juros
    debts.forEach(d => {
      if (d.amount > 0) {
        const interest = d.amount * (d.interestRate / 100);
        d.amount += interest;
        totalInterestPaid += interest;
      }
    });

    // Pagar mínimos
    debts.forEach(d => {
      if (d.amount > 0 && remainingMargin > 0) {
        const payment = Math.min(d.minimumPayment, d.amount, remainingMargin);
        d.amount -= payment;
        remainingMargin -= payment;

        if (d.amount < 0.01) d.amount = 0;
      }
    });

    // Atacar primeira dívida com saldo > 0
    const targetDebt = debts.find(d => d.amount > 0);
    if (targetDebt && remainingMargin > 0) {
      const extraPayment = Math.min(remainingMargin, targetDebt.amount);
      targetDebt.amount -= extraPayment;

      if (targetDebt.amount < 0.01) {
        targetDebt.amount = 0;
        timeline.push({
          month,
          event: `${targetDebt.type} quitado!`,
          remaining: debts.filter(d => d.amount > 0).length
        });
      }
    }
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterestPaid),
    timeline: timeline.slice(0, 10), // Primeiras 10 vitórias
    finalAmount: debts.reduce((sum, d) => sum + d.amount, 0)
  };
}

/**
 * Calcula plano mês a mês personalizado
 * @param {Array} debts
 * @param {Number} availableMargin
 * @param {String} strategy - 'snowball' ou 'avalanche'
 * @returns {Array} - Plano mensal
 */
export function createMonthlyPlan(debts, availableMargin, strategy = 'avalanche') {
  if (!debts || debts.length === 0) return [];

  const sorted = strategy === 'snowball'
    ? [...debts].sort((a, b) => a.amount - b.amount)
    : [...debts].sort((a, b) => b.interestRate - a.interestRate);

  const plan = [];
  let currentPhase = 1;
  let remainingDebts = [...sorted];

  while (remainingDebts.length > 0 && currentPhase <= 10) {
    const target = remainingDebts[0];
    const monthsToPayoff = Math.ceil(target.amount / (availableMargin - sorted.reduce((sum, d) => d !== target ? sum + d.minimumPayment : sum, 0)));

    plan.push({
      phase: currentPhase,
      target: target.type,
      targetAmount: Math.round(target.amount),
      monthsEstimated: monthsToPayoff > 0 ? monthsToPayoff : 1,
      distribution: {
        toTarget: availableMargin - remainingDebts.slice(1).reduce((sum, d) => sum + d.minimumPayment, 0),
        toOthers: remainingDebts.slice(1).map(d => ({
          type: d.type,
          payment: d.minimumPayment
        }))
      }
    });

    remainingDebts.shift();
    currentPhase++;
  }

  return plan;
}

/**
 * Calcula prioridade de urgência das dívidas
 * @param {Array} debts
 * @returns {Array} - Dívidas com classificação de urgência
 */
export function classifyUrgency(debts) {
  return debts.map(d => {
    let urgency = 'medium';
    let emoji = '🟡';

    // Cartão de crédito com juros > 10% = urgente
    if (d.type.toLowerCase().includes('cartão') && d.interestRate > 10) {
      urgency = 'urgent';
      emoji = '🔴';
    }
    // Juros > 15% = urgente
    else if (d.interestRate > 15) {
      urgency = 'urgent';
      emoji = '🔴';
    }
    // Juros < 2% = baixa urgência
    else if (d.interestRate < 2) {
      urgency = 'low';
      emoji = '🟢';
    }

    return {
      ...d,
      urgency,
      emoji,
      monthlyCost: Math.round(d.amount * (d.interestRate / 100))
    };
  });
}

/**
 * Prepara contexto completo para o agente DEBT_DESTROYER
 * @param {Array} transactions
 * @param {Number} monthlyIncome
 * @param {Number} essentialExpenses
 * @returns {Object}
 */
export function prepareDebtContext(transactions, monthlyIncome, essentialExpenses) {
  const detectedDebts = identifyDebts(transactions);
  const availableMargin = monthlyIncome - essentialExpenses;

  // Mapear dívidas para formato esperado
  // (em produção, isso viria de uma tabela debts)
  const formattedDebts = [];

  // TODO: Em produção, buscar do banco de dados
  // Por ora, retorna estrutura vazia se não houver dívidas cadastradas

  return {
    debts: formattedDebts,
    monthlyIncome,
    essentialExpenses,
    availableMargin,
    hasDebts: formattedDebts.length > 0
  };
}

export default {
  identifyDebts,
  calculatePayoffStrategies,
  createMonthlyPlan,
  classifyUrgency,
  prepareDebtContext
};
