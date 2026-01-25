/**
 * Sistema de Estado de Conversa - Zeni
 *
 * Mantém contexto entre mensagens para conversas multi-turno inteligentes.
 * Armazena: ação pendente, entidade em discussão, último agente, etc.
 */

import pool from '../db/connection.js';
import { logger } from './logger.js';

// Tipos de ações pendentes
export const PENDING_ACTIONS = {
  CREATE_BUDGET: 'create_budget',             // Criar orçamento
  CONFIRM_TRANSACTION: 'confirm_transaction', // Confirmar transação
  CHOOSE_CATEGORY: 'choose_category',         // Escolher categoria
  REALLOCATE_BUDGET: 'reallocate_budget',     // Realocar orçamento
  SET_GOAL: 'set_goal',                       // Definir meta/objetivo
  EXPLAIN_MORE: 'explain_more',               // Explicar mais
  CONFIRM_GOAL: 'confirm_goal',               // Confirmar criação de objetivo
  NONE: null
};

/**
 * Busca o estado atual da conversa do usuário
 */
export async function getConversationState(userId) {
  try {
    const result = await pool.query(`
      SELECT state_data FROM conversation_state
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return getDefaultState();
    }

    return result.rows[0].state_data;
  } catch (error) {
    // Se a tabela não existir, retorna estado padrão
    logger.debug({ error: error.message }, 'Conversation state table not found, using default');
    return getDefaultState();
  }
}

/**
 * Salva o estado da conversa
 */
export async function saveConversationState(userId, state) {
  try {
    await pool.query(`
      INSERT INTO conversation_state (user_id, state_data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET state_data = $2, updated_at = NOW()
    `, [userId, JSON.stringify(state)]);
  } catch (error) {
    logger.error({ error: error.message }, 'Error saving conversation state');
    // Não propaga erro - estado é auxiliar, não crítico
  }
}

/**
 * Limpa o estado (após conclusão de ação)
 */
export async function clearConversationState(userId) {
  await saveConversationState(userId, getDefaultState());
}

/**
 * Estado padrão
 */
function getDefaultState() {
  return {
    pendingAction: null,
    context: {},
    lastAgent: null,
    lastQuestion: null,
    awaitingConfirmation: false,
    turnCount: 0
  };
}

/**
 * Padrões que indicam uma pergunta ou pedido de confirmação
 */
const QUESTION_PATTERNS = [
  /\?\s*$/,                           // Termina com ?
  /quer que eu/i,                     // "Quer que eu..."
  /gostaria de/i,                     // "Gostaria de..."
  /prefere/i,                         // "Prefere..."
  /o que acha/i,                      // "O que acha?"
  /pode confirmar/i,                  // "Pode confirmar?"
  /posso (criar|definir|registrar)/i, // "Posso criar..."
  /devo (continuar|prosseguir)/i,     // "Devo continuar?"
];

/**
 * Mapa de padrões para ações pendentes
 */
const ACTION_PATTERNS = {
  [PENDING_ACTIONS.CREATE_BUDGET]: [
    /criar.*or[çc]amento/i,
    /definir.*limite/i,
    /montar.*or[çc]amento/i,
    /configurar.*or[çc]amento/i,
    /quer que eu defina/i,
    /quer que eu crie.*or[çc]amento/i,
  ],
  [PENDING_ACTIONS.CONFIRM_TRANSACTION]: [
    /registr(ar|o|ei)/i,
    /anotar/i,
    /quer que eu registre/i,
    /posso registrar/i,
    /salvar.*transa[çc][ãa]o/i,
  ],
  [PENDING_ACTIONS.CHOOSE_CATEGORY]: [
    /qual categoria/i,
    /escolher categoria/i,
    /categoria certa/i,
    /em qual categoria/i,
  ],
  [PENDING_ACTIONS.REALLOCATE_BUDGET]: [
    /realocar/i,
    /transferir.*or[çc]amento/i,
    /mover.*verba/i,
    /redistribuir/i,
  ],
  [PENDING_ACTIONS.SET_GOAL]: [
    /criar.*meta/i,
    /criar.*objetivo/i,
    /definir.*objetivo/i,
    /estabelecer.*meta/i,
  ],
  [PENDING_ACTIONS.EXPLAIN_MORE]: [
    /quer saber mais/i,
    /explicar mais/i,
    /posso detalhar/i,
    /quer que eu explique/i,
    /quer mais detalhes/i,
  ],
};

/**
 * Padrões para extrair valores monetários
 */
const VALUE_PATTERNS = [
  /r\$\s*([\d]+(?:\.[\d]{3})*(?:,[\d]{1,2})?)/gi,   // R$ 1.234,56
  /r\$\s*([\d]+(?:,[\d]{1,2})?)/gi,                  // R$ 1234,56 ou R$ 50
  /([\d]+(?:\.[\d]{3})*(?:,[\d]{2})?)\s*reais/gi,    // 1.234,56 reais
  /([\d]+)\s*(?:mil|k)/gi,                           // 50 mil ou 50k
];

/**
 * Analisa a última resposta do assistente para extrair estado
 * Versão melhorada com detecção mais robusta
 */
export function extractStateFromResponse(response, agent) {
  const state = {
    pendingAction: null,
    context: {},
    lastAgent: agent,
    lastQuestion: null,
    awaitingConfirmation: false,
  };

  const responseLower = response.toLowerCase();

  // 1. Detecta se a IA fez uma pergunta de forma mais robusta
  state.awaitingConfirmation = QUESTION_PATTERNS.some(pattern => pattern.test(response));

  if (state.awaitingConfirmation) {
    // Extrair a última pergunta significativa
    const sentences = response.split(/[.!]\s+/);
    const questions = sentences.filter(s =>
      QUESTION_PATTERNS.some(pattern => pattern.test(s))
    );

    if (questions.length > 0) {
      state.lastQuestion = questions[questions.length - 1].trim();
    }
  }

  // 2. Detecta ações pendentes com padrões mais precisos
  for (const [action, patterns] of Object.entries(ACTION_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(responseLower))) {
      state.pendingAction = action;
      break;
    }
  }

  // 3. Extrai valores mencionados de forma mais robusta
  for (const pattern of VALUE_PATTERNS) {
    const matches = [...responseLower.matchAll(pattern)];
    if (matches.length > 0) {
      // Pegar o último valor mencionado (geralmente o mais relevante)
      const lastMatch = matches[matches.length - 1];
      let value = lastMatch[1];

      // Normalizar valor
      if (/mil|k/i.test(lastMatch[0])) {
        value = parseFloat(value) * 1000;
      } else {
        // Formato brasileiro: 1.234,56 → 1234.56
        value = value.replace(/\./g, '').replace(',', '.');
        value = parseFloat(value);
      }

      if (!isNaN(value)) {
        state.context.lastMentionedValue = value;
        break;
      }
    }
  }

  // 4. Extrai categorias mencionadas (expandido)
  const categories = [
    'mercado', 'restaurante', 'casa', 'carro', 'saúde', 'lazer',
    'educação', 'vestuário', 'transporte', 'alimentação', 'moradia',
    'entretenimento', 'viagem', 'investimento', 'salário', 'cartão',
    'financiamento', 'farmácia', 'uber', 'ifood',
  ];
  const mentionedCategories = categories.filter(cat => responseLower.includes(cat));
  if (mentionedCategories.length > 0) {
    state.context.lastMentionedCategories = mentionedCategories;
  }

  // 5. Detectar menção a período/mês
  const monthMatch = responseLower.match(/\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i);
  if (monthMatch) {
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    state.context.lastMentionedMonth = monthNames.indexOf(monthMatch[1].toLowerCase()) + 1;
  }

  // 6. Detectar menção a ano
  const yearMatch = responseLower.match(/\b(20[2-3][0-9])\b/);
  if (yearMatch) {
    state.context.lastMentionedYear = parseInt(yearMatch[1], 10);
  }

  return state;
}

/**
 * Determina a intenção do usuário baseado na mensagem curta + estado
 */
export function resolveShortResponse(userMessage, state) {
  const msg = userMessage.toLowerCase().trim();

  // Respostas afirmativas
  const isYes = /^(sim|quero|ok|isso|pode|claro|bora|vamos|por favor|afirmativo|yes|s|confirma|confirmo|aceito)$/i.test(msg);

  // Respostas negativas
  const isNo = /^(não|nao|n|nunca|jamais|deixa|cancela|esquece)$/i.test(msg);

  // Pedidos de ajuda/recomendação
  const isHelp = /^(ajuda|me ajuda|o que (vc|você) (indica|sugere|recomenda)|indica|sugere|recomenda)/.test(msg);

  if (isYes && state.pendingAction) {
    return {
      action: state.pendingAction,
      confirmed: true,
      context: state.context
    };
  }

  if (isNo && state.pendingAction) {
    return {
      action: 'cancel',
      confirmed: false,
      context: state.context
    };
  }

  if (isHelp) {
    return {
      action: 'recommend',
      context: state.context
    };
  }

  return null;
}

/**
 * Gera instrução adicional para o prompt baseado no estado
 */
export function getStateInstruction(state, userMessage, resolvedIntent) {
  if (!state || !state.awaitingConfirmation) {
    return '';
  }

  let instruction = '\n\n## CONTEXTO DA CONVERSA ANTERIOR\n';

  if (state.lastQuestion) {
    instruction += `Você perguntou: "${state.lastQuestion}"\n`;
  }

  if (resolvedIntent) {
    if (resolvedIntent.confirmed) {
      instruction += `O usuário CONFIRMOU que quer prosseguir com: ${resolvedIntent.action}\n`;
      instruction += `EXECUTE A AÇÃO AGORA. Não repita a pergunta. Não peça confirmação novamente.\n`;

      if (resolvedIntent.action === PENDING_ACTIONS.CREATE_BUDGET) {
        instruction += `\nCrie um orçamento sugerido baseado nos gastos atuais do usuário. Apresente valores por categoria.\n`;
      }
    } else if (resolvedIntent.action === 'cancel') {
      instruction += `O usuário CANCELOU a ação. Pergunte como mais você pode ajudar.\n`;
    } else if (resolvedIntent.action === 'recommend') {
      instruction += `O usuário quer sua RECOMENDAÇÃO. Dê conselhos práticos e específicos baseados nos dados financeiros.\n`;
    }
  }

  if (state.context.lastMentionedValue) {
    instruction += `Valor em discussão: R$${state.context.lastMentionedValue}\n`;
  }

  if (state.context.lastMentionedCategories?.length > 0) {
    instruction += `Categorias em discussão: ${state.context.lastMentionedCategories.join(', ')}\n`;
  }

  return instruction;
}

export default {
  getConversationState,
  saveConversationState,
  clearConversationState,
  extractStateFromResponse,
  resolveShortResponse,
  getStateInstruction,
  PENDING_ACTIONS
};
