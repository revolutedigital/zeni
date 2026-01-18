/**
 * Zeni Personality System
 * Sistema de personalidade da mascote Zeni
 *
 * Baseado em:
 * - Duolingo Personality System
 * - Fintech Engagement Best Practices 2026
 */

// Mensagens contextuais da Zeni
export const ZENI_MESSAGES = {
  // Saudações por período do dia
  greetings: {
    morning: [
      'Bom dia! Pronta pra mais um dia de controle financeiro?',
      'Oi! Que tal começar o dia registrando seus gastos?',
      'Bom dia! Vamos fazer esse dia render?',
    ],
    afternoon: [
      'Boa tarde! Como estão as finanças hoje?',
      'Oi! Não esquece de registrar os gastos do almoço!',
      'Boa tarde! Já conferiu seu orçamento?',
    ],
    evening: [
      'Boa noite! Hora de fechar as contas do dia!',
      'Oi! Vamos ver como foi o dia financeiramente?',
      'Boa noite! Registrou todos os gastos de hoje?',
    ],
    night: [
      'Ainda acordada? Eu também! Vamos organizar as finanças?',
      'Trabalhando até tarde? Lembre de descansar!',
      'Oi! Que tal dar uma olhada nas contas antes de dormir?',
    ],
  },

  // Reações a eventos financeiros
  reactions: {
    // Economia positiva
    savings: [
      'Parabéns! Você economizou esse mês!',
      'Incrível! Continue assim e vai longe!',
      'Arrasou! Sua disciplina está dando resultado!',
    ],
    // Meta batida
    goalAchieved: [
      'VOCÊ CONSEGUIU! A meta foi batida!',
      'Que orgulho! Meta alcançada com sucesso!',
      'UAU! Você provou que é possível!',
    ],
    // Orçamento estourado
    budgetExceeded: [
      'Ei, vamos conversar sobre isso?',
      'Calma, respira... podemos ajustar!',
      'Ops! Passou um pouquinho do orçamento...',
    ],
    // Gastos altos
    highSpending: [
      'Hmm, esse gasto foi alto, viu?',
      'Tá tudo bem? Esse valor me preocupou...',
      'Ei, precisa de ajuda pra entender esse gasto?',
    ],
    // Sequência de registros
    streak: [
      'Dias seguidos registrando! Você é demais!',
      'Que consistência! Continue assim!',
      'Você está voando! Não pare agora!',
    ],
    // Primeira transação do dia
    firstTransaction: [
      'Boa! Primeiro registro do dia!',
      'Começando bem! Vamos nessa!',
      'Adorei! Já estamos no ritmo!',
    ],
  },

  // Ausência do usuário
  absence: {
    day1: [
      'Oi! Senti sua falta ontem...',
      'Ei, tudo bem? Não te vi ontem!',
    ],
    day3: [
      'Faz 3 dias! Tô com saudade!',
      'Oi sumido(a)! Vamos atualizar as contas?',
    ],
    week: [
      'Uma semana sem nos falar? Tô preocupada!',
      'Ei, volta! Suas finanças sentem sua falta!',
    ],
  },

  // Incentivos
  encouragement: [
    'Você consegue! Eu acredito em você!',
    'Um passo de cada vez, tá indo bem!',
    'Não desista! Estou aqui pra te ajudar!',
    'Cada registro conta! Continue assim!',
  ],

  // Celebrações especiais
  celebrations: {
    firstWeek: 'Uma semana usando o Zeni! Parabéns!',
    firstMonth: 'Um mês juntos! Isso é incrível!',
    milestone100: '100 transações registradas! Você é dedicado(a)!',
    milestone500: '500 transações! Você é um expert!',
    yearEnd: 'Ano novo chegando! Vamos revisar suas conquistas?',
  },

  // Dicas financeiras
  tips: [
    'Sabia que separar 10% do salário já faz diferença?',
    'Pequenos gastos diários somam muito no mês!',
    'Que tal definir uma meta de economia pro próximo mês?',
    'Já pensou em criar um fundo de emergência?',
    'Revisar os gastos semanalmente ajuda muito!',
  ],
};

// Variantes da Zeni para cada contexto
export const ZENI_MOODS = {
  savings: 'happy',
  goalAchieved: 'happy',
  budgetExceeded: 'worried',
  highSpending: 'worried',
  streak: 'happy',
  firstTransaction: 'waving',
  absence: 'worried',
  encouragement: 'default',
  celebration: 'happy',
  tip: 'thinking',
};

/**
 * Determina a saudação baseada no horário
 */
export function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  let period;

  if (hour >= 5 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 18) period = 'afternoon';
  else if (hour >= 18 && hour < 22) period = 'evening';
  else period = 'night';

  const messages = ZENI_MESSAGES.greetings[period];
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    mood: 'waving',
    period,
  };
}

/**
 * Retorna reação baseada em evento financeiro
 */
export function getFinancialReaction(event, data = {}) {
  const messages = ZENI_MESSAGES.reactions[event];
  if (!messages) return null;

  let message = messages[Math.floor(Math.random() * messages.length)];

  // Personalização com dados
  if (data.amount) {
    message = message.replace('{amount}', formatCurrency(data.amount));
  }
  if (data.days) {
    message = message.replace('{days}', data.days);
  }

  return {
    message,
    mood: ZENI_MOODS[event] || 'default',
    event,
  };
}

/**
 * Retorna mensagem de ausência
 */
export function getAbsenceMessage(daysSinceLastVisit) {
  let key;
  if (daysSinceLastVisit === 1) key = 'day1';
  else if (daysSinceLastVisit <= 3) key = 'day3';
  else key = 'week';

  const messages = ZENI_MESSAGES.absence[key];
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    mood: 'worried',
    daysSinceLastVisit,
  };
}

/**
 * Retorna dica financeira aleatória
 */
export function getRandomTip() {
  const tips = ZENI_MESSAGES.tips;
  return {
    message: tips[Math.floor(Math.random() * tips.length)],
    mood: 'thinking',
    type: 'tip',
  };
}

/**
 * Retorna incentivo aleatório
 */
export function getEncouragement() {
  const messages = ZENI_MESSAGES.encouragement;
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    mood: 'happy',
    type: 'encouragement',
  };
}

/**
 * Verifica se há celebração especial
 */
export function checkCelebration(stats) {
  const { daysActive, transactionCount, isYearEnd } = stats;

  if (isYearEnd) {
    return {
      message: ZENI_MESSAGES.celebrations.yearEnd,
      mood: 'happy',
      type: 'yearEnd',
    };
  }

  if (transactionCount >= 500) {
    return {
      message: ZENI_MESSAGES.celebrations.milestone500,
      mood: 'happy',
      type: 'milestone',
    };
  }

  if (transactionCount >= 100) {
    return {
      message: ZENI_MESSAGES.celebrations.milestone100,
      mood: 'happy',
      type: 'milestone',
    };
  }

  if (daysActive === 30) {
    return {
      message: ZENI_MESSAGES.celebrations.firstMonth,
      mood: 'happy',
      type: 'anniversary',
    };
  }

  if (daysActive === 7) {
    return {
      message: ZENI_MESSAGES.celebrations.firstWeek,
      mood: 'happy',
      type: 'anniversary',
    };
  }

  return null;
}

/**
 * Analisa finanças e retorna contexto emocional
 */
export function analyzeFinancialContext(data) {
  const { income, expenses, budget, previousExpenses } = data;
  const balance = income - expenses;
  const budgetUsage = budget > 0 ? (expenses / budget) * 100 : 0;

  // Determina o contexto
  let context = 'neutral';
  let reaction = null;

  if (balance > 0 && expenses < previousExpenses) {
    context = 'positive';
    reaction = getFinancialReaction('savings');
  } else if (budgetUsage > 100) {
    context = 'warning';
    reaction = getFinancialReaction('budgetExceeded');
  } else if (budgetUsage > 80) {
    context = 'caution';
    reaction = {
      message: 'Atenção! Já usou 80% do orçamento!',
      mood: 'worried',
    };
  }

  return {
    context,
    reaction,
    stats: {
      balance,
      budgetUsage: Math.round(budgetUsage),
      savingsRate: income > 0 ? Math.round((balance / income) * 100) : 0,
    },
  };
}

/**
 * Gera mensagem completa com personalidade
 */
export function generatePersonalityResponse(type, data = {}) {
  switch (type) {
    case 'greeting':
      return getTimeBasedGreeting();

    case 'reaction':
      return getFinancialReaction(data.event, data);

    case 'absence':
      return getAbsenceMessage(data.days);

    case 'tip':
      return getRandomTip();

    case 'encouragement':
      return getEncouragement();

    case 'celebration':
      return checkCelebration(data);

    case 'financial':
      return analyzeFinancialContext(data);

    default:
      return {
        message: 'Oi! Em que posso ajudar?',
        mood: 'default',
      };
  }
}

// Helpers
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default {
  ZENI_MESSAGES,
  ZENI_MOODS,
  getTimeBasedGreeting,
  getFinancialReaction,
  getAbsenceMessage,
  getRandomTip,
  getEncouragement,
  checkCelebration,
  analyzeFinancialContext,
  generatePersonalityResponse,
};
