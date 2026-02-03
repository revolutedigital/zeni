import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useZeniPersonality - Hook para sistema de personalidade da Zeni
 * Motion-First + Personality System 2026
 *
 * Gerencia:
 * - Humor/mood da Zeni
 * - Mensagens contextuais
 * - Reações a eventos financeiros
 * - Celebrações e conquistas
 */

// Mensagens da Zeni (espelho do backend)
const ZENI_MESSAGES = {
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
  reactions: {
    savings: [
      'Parabéns! Você economizou esse mês!',
      'Incrível! Continue assim e vai longe!',
      'Arrasou! Sua disciplina está dando resultado!',
    ],
    goalAchieved: [
      'VOCÊ CONSEGUIU! A meta foi batida!',
      'Que orgulho! Meta alcançada com sucesso!',
      'UAU! Você provou que é possível!',
    ],
    budgetExceeded: [
      'Ei, vamos conversar sobre isso?',
      'Calma, respira... podemos ajustar!',
      'Ops! Passou um pouquinho do orçamento...',
    ],
    highSpending: [
      'Hmm, esse gasto foi alto, viu?',
      'Tá tudo bem? Esse valor me preocupou...',
      'Ei, precisa de ajuda pra entender esse gasto?',
    ],
    streak: [
      'Dias seguidos registrando! Você é demais!',
      'Que consistência! Continue assim!',
      'Você está voando! Não pare agora!',
    ],
    firstTransaction: [
      'Boa! Primeiro registro do dia!',
      'Começando bem! Vamos nessa!',
      'Adorei! Já estamos no ritmo!',
    ],
    transactionAdded: [
      'Registrado! Assim que eu gosto!',
      'Anotado! Continue assim!',
      'Feito! Você é organizado(a)!',
    ],
  },
  encouragement: [
    'Você consegue! Eu acredito em você!',
    'Um passo de cada vez, tá indo bem!',
    'Não desista! Estou aqui pra te ajudar!',
    'Cada registro conta! Continue assim!',
  ],
  tips: [
    'Sabia que separar 10% do salário já faz diferença?',
    'Pequenos gastos diários somam muito no mês!',
    'Que tal definir uma meta de economia pro próximo mês?',
    'Já pensou em criar um fundo de emergência?',
    'Revisar os gastos semanalmente ajuda muito!',
  ],
};

// Mapeamento de eventos para moods
const EVENT_MOODS = {
  savings: 'happy',
  goalAchieved: 'happy',
  budgetExceeded: 'worried',
  highSpending: 'worried',
  streak: 'happy',
  firstTransaction: 'waving',
  transactionAdded: 'happy',
  encouragement: 'default',
  tip: 'thinking',
  error: 'worried',
  loading: 'thinking',
  idle: 'default',
};

/**
 * Retorna período do dia
 */
function getTimePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Escolhe mensagem aleatória de um array
 */
function pickRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Hook principal de personalidade
 */
export function useZeniPersonality() {
  const [mood, setMood] = useState('default');
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [animationType, setAnimationType] = useState('float');

  // Saudação inicial baseada no horário
  const greeting = useMemo(() => {
    const period = getTimePeriod();
    return pickRandom(ZENI_MESSAGES.greetings[period]);
  }, []);

  // Mostrar mensagem temporária
  const showMessage = useCallback((text, newMood = 'default', duration = 4000, animation = 'pop') => {
    setMessage(text);
    setMood(newMood);
    setAnimationType(animation);
    setIsVisible(true);

    if (duration > 0) {
      setTimeout(() => {
        setIsVisible(false);
      }, duration);
    }
  }, []);

  // Esconder mensagem
  const hideMessage = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Reagir a evento financeiro
  const react = useCallback((event, customMessage = null) => {
    const messages = ZENI_MESSAGES.reactions[event];
    const text = customMessage || (messages ? pickRandom(messages) : 'Hmm...');
    const newMood = EVENT_MOODS[event] || 'default';

    // Animação baseada no evento
    let animation = 'pop';
    if (event === 'goalAchieved' || event === 'savings') animation = 'bounce';
    if (event === 'budgetExceeded' || event === 'highSpending') animation = 'wiggle';

    showMessage(text, newMood, 5000, animation);
  }, [showMessage]);

  // Celebrar conquista
  const celebrate = useCallback((customMessage = null) => {
    const text = customMessage || pickRandom(ZENI_MESSAGES.reactions.goalAchieved);
    setMood('happy');
    setMessage(text);
    setAnimationType('bounce');
    setIsVisible(true);

    setTimeout(() => setIsVisible(false), 6000);
  }, []);

  // Mostrar preocupação
  const worry = useCallback((customMessage = null) => {
    const text = customMessage || pickRandom(ZENI_MESSAGES.reactions.budgetExceeded);
    showMessage(text, 'worried', 5000, 'wiggle');
  }, [showMessage]);

  // Dar dica
  const giveTip = useCallback(() => {
    const tip = pickRandom(ZENI_MESSAGES.tips);
    showMessage(tip, 'thinking', 6000, 'float');
  }, [showMessage]);

  // Encorajar
  const encourage = useCallback(() => {
    const msg = pickRandom(ZENI_MESSAGES.encouragement);
    showMessage(msg, 'happy', 4000, 'pop');
  }, [showMessage]);

  // Estado de loading
  const setLoading = useCallback((isLoading) => {
    if (isLoading) {
      setMood('thinking');
      setAnimationType('breathe');
    } else {
      setMood('default');
      setAnimationType('float');
    }
  }, []);

  // Reset para estado padrão
  const reset = useCallback(() => {
    setMood('default');
    setMessage('');
    setIsVisible(false);
    setAnimationType('float');
  }, []);

  return {
    // Estado
    mood,
    message,
    isVisible,
    animationType,
    greeting,

    // Ações
    showMessage,
    hideMessage,
    react,
    celebrate,
    worry,
    giveTip,
    encourage,
    setLoading,
    reset,
    setMood,
  };
}

/**
 * Hook para análise de contexto financeiro
 */
export function useFinancialContext(data) {
  const { income = 0, expenses = 0, budget = 0, previousExpenses = 0 } = data || {};

  const analysis = useMemo(() => {
    const balance = income - expenses;
    const budgetUsage = budget > 0 ? (expenses / budget) * 100 : 0;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    let status = 'neutral';
    let suggestion = '';

    if (balance > 0 && expenses < previousExpenses) {
      status = 'excellent';
      suggestion = 'Continue assim! Você está economizando!';
    } else if (budgetUsage > 100) {
      status = 'warning';
      suggestion = 'Ops! O orçamento foi ultrapassado.';
    } else if (budgetUsage > 80) {
      status = 'caution';
      suggestion = 'Atenção! Quase no limite do orçamento.';
    } else if (budgetUsage > 50) {
      status = 'moderate';
      suggestion = 'Metade do orçamento usado. Tá indo bem!';
    } else {
      status = 'good';
      suggestion = 'Tudo sob controle!';
    }

    return {
      balance,
      budgetUsage: Math.round(budgetUsage),
      savingsRate: Math.round(savingsRate),
      status,
      suggestion,
    };
  }, [income, expenses, budget, previousExpenses]);

  return analysis;
}

/**
 * Hook para streak de dias
 */
export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [lastActivity, setLastActivity] = useState(null);

  // Carregar do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zeni_streak');
    if (saved) {
      const data = JSON.parse(saved);
      setStreak(data.streak || 0);
      setLastActivity(data.lastActivity ? new Date(data.lastActivity) : null);
    }
  }, []);

  // Registrar atividade
  const recordActivity = useCallback(() => {
    const today = new Date().toDateString();
    const lastDate = lastActivity?.toDateString();

    let newStreak = streak;

    if (lastDate === today) {
      // Já registrou hoje
      return streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate === yesterday.toDateString()) {
      // Dia consecutivo
      newStreak = streak + 1;
    } else if (lastDate !== today) {
      // Quebrou a sequência
      newStreak = 1;
    }

    const newData = {
      streak: newStreak,
      lastActivity: new Date().toISOString(),
    };

    localStorage.setItem('zeni_streak', JSON.stringify(newData));
    setStreak(newStreak);
    setLastActivity(new Date());

    return newStreak;
  }, [streak, lastActivity]);

  return { streak, recordActivity };
}

export default useZeniPersonality;
