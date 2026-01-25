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
  CREATE_BUDGET: 'create_budget',           // Criar orçamento
  CONFIRM_TRANSACTION: 'confirm_transaction', // Confirmar transação
  CHOOSE_CATEGORY: 'choose_category',        // Escolher categoria
  REALLOCATE_BUDGET: 'reallocate_budget',    // Realocar orçamento
  SET_GOAL: 'set_goal',                      // Definir meta
  EXPLAIN_MORE: 'explain_more',              // Explicar mais
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
 * Analisa a última resposta do assistente para extrair estado
 */
export function extractStateFromResponse(response, agent) {
  const state = {
    pendingAction: null,
    context: {},
    lastAgent: agent,
    lastQuestion: null,
    awaitingConfirmation: false
  };

  const responseLower = response.toLowerCase();

  // Detecta se a IA fez uma pergunta
  if (response.includes('?')) {
    state.awaitingConfirmation = true;

    // Extrair a última pergunta
    const sentences = response.split(/[.!]/);
    const questions = sentences.filter(s => s.includes('?'));
    if (questions.length > 0) {
      state.lastQuestion = questions[questions.length - 1].trim();
    }
  }

  // Detecta ações pendentes baseado no conteúdo
  if (/definir.*orçamento|criar.*orçamento|montar.*orçamento|configurar.*orçamento/i.test(responseLower)) {
    state.pendingAction = PENDING_ACTIONS.CREATE_BUDGET;
  } else if (/registrar|registr(ar|o)|quer que eu registre/i.test(responseLower)) {
    state.pendingAction = PENDING_ACTIONS.CONFIRM_TRANSACTION;
  } else if (/qual categoria|escolher categoria|categoria certa/i.test(responseLower)) {
    state.pendingAction = PENDING_ACTIONS.CHOOSE_CATEGORY;
  } else if (/realocar|transferir.*orçamento|mover.*verba/i.test(responseLower)) {
    state.pendingAction = PENDING_ACTIONS.REALLOCATE_BUDGET;
  } else if (/quer saber mais|explicar mais|posso detalhar/i.test(responseLower)) {
    state.pendingAction = PENDING_ACTIONS.EXPLAIN_MORE;
  }

  // Extrai valores mencionados
  const valueMatch = responseLower.match(/r\$\s*([\d.,]+)/);
  if (valueMatch) {
    state.context.lastMentionedValue = parseFloat(valueMatch[1].replace('.', '').replace(',', '.'));
  }

  // Extrai categorias mencionadas
  const categories = ['mercado', 'restaurante', 'casa', 'carro', 'saúde', 'lazer', 'educação', 'vestuário'];
  const mentionedCategories = categories.filter(cat => responseLower.includes(cat));
  if (mentionedCategories.length > 0) {
    state.context.lastMentionedCategories = mentionedCategories;
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
