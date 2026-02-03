/**
 * Smart Memory Service - Zeni
 *
 * Sistema de memória inteligente que:
 * 1. Sumariza conversas longas ao invés de truncar
 * 2. Extrai e armazena fatos importantes do usuário
 * 3. Implementa hierarquia de memória (short/medium/long term)
 *
 * Baseado em: https://mem0.ai/blog/llm-chat-history-summarization-guide-2025
 */

import { callClaude } from './claude.js';
import pool from '../db/connection.js';
import { logger } from './logger.js';

// Configurações
const CONFIG = {
  SHORT_TERM_LIMIT: 6,      // Últimas 6 mensagens verbatim (3 turnos)
  MEDIUM_TERM_LIMIT: 20,    // Próximas 20 como resumo
  SUMMARY_THRESHOLD: 10,    // Sumarizar quando > 10 mensagens
  MAX_TOKENS_ESTIMATE: 150, // Estimativa de tokens por mensagem
};

/**
 * Busca memória otimizada para o contexto
 * Combina: mensagens recentes + resumo + fatos do usuário
 */
export async function getSmartContext(userId, currentMessage) {
  try {
    // 1. Buscar histórico completo recente
    const historyResult = await pool.query(`
      SELECT role, content, created_at
      FROM chat_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, CONFIG.MEDIUM_TERM_LIMIT]);

    const allMessages = historyResult.rows.reverse();

    // 2. Se poucas mensagens, retorna tudo
    if (allMessages.length <= CONFIG.SHORT_TERM_LIMIT) {
      return {
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        summary: null,
        facts: await getUserFacts(userId),
      };
    }

    // 3. Separar em short-term (recentes) e medium-term (para resumir)
    const shortTerm = allMessages.slice(-CONFIG.SHORT_TERM_LIMIT);
    const mediumTerm = allMessages.slice(0, -CONFIG.SHORT_TERM_LIMIT);

    // 4. Gerar ou buscar resumo do medium-term
    const summary = await getOrCreateSummary(userId, mediumTerm);

    // 5. Buscar fatos do usuário
    const facts = await getUserFacts(userId);

    return {
      messages: shortTerm.map(m => ({ role: m.role, content: m.content })),
      summary,
      facts,
    };
  } catch (error) {
    logger.error({ err: error, userId }, 'Error getting smart context');
    // Fallback: retorna histórico simples
    return { messages: [], summary: null, facts: [] };
  }
}

/**
 * Gera ou recupera resumo de mensagens antigas
 */
async function getOrCreateSummary(userId, messages) {
  if (messages.length < 3) return null;

  // Verificar se já existe resumo recente (cache de 1 hora)
  try {
    const cached = await pool.query(`
      SELECT summary FROM conversation_summaries
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (cached.rows.length > 0) {
      return cached.rows[0].summary;
    }
  } catch (e) {
    // Tabela pode não existir ainda - log para debugging
    logger.debug({ err: e.message }, 'conversation_summaries table may not exist');
  }

  // Gerar novo resumo
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Usuário' : 'Zeni'}: ${m.content}`)
    .join('\n');

  const summaryPrompt = `Resuma esta conversa em 2-3 frases, focando em:
1. O que o usuário perguntou/pediu
2. Decisões tomadas
3. Informações importantes mencionadas

Conversa:
${conversationText}

Resumo conciso:`;

  try {
    const summary = await callClaude(
      'Você é um assistente que cria resumos concisos de conversas financeiras.',
      summaryPrompt,
      'claude-3-haiku-20240307'
    );

    // Salvar resumo (se tabela existir)
    try {
      await pool.query(`
        INSERT INTO conversation_summaries (user_id, summary, message_count)
        VALUES ($1, $2, $3)
      `, [userId, summary, messages.length]);
    } catch (e) {
      // Tabela pode não existir - log para debugging
      logger.debug({ err: e.message }, 'Failed to save summary - table may not exist');
    }

    return summary;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to generate summary');
    return null;
  }
}

/**
 * Busca fatos conhecidos sobre o usuário (long-term memory)
 */
async function getUserFacts(userId) {
  try {
    const result = await pool.query(`
      SELECT fact_type, fact_value
      FROM user_facts
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 10
    `, [userId]);

    return result.rows;
  } catch (e) {
    // Tabela pode não existir - log para debugging
    logger.debug({ err: e.message }, 'user_facts table may not exist');
    return [];
  }
}

/**
 * Extrai e salva fatos importantes da conversa
 * Chamado após cada resposta do assistente
 */
export async function extractAndSaveFacts(userId, userMessage, assistantResponse) {
  // Detectar fatos importantes
  const facts = [];

  // Detectar preferências de categoria
  const categoryPrefs = userMessage.match(/prefiro|gosto de|sempre (compro|gasto) em/i);
  if (categoryPrefs) {
    facts.push({ type: 'preference', value: userMessage.substring(0, 100) });
  }

  // Detectar metas mencionadas
  const goals = userMessage.match(/quero (economizar|juntar|guardar|investir)\s+(\d+)/i);
  if (goals) {
    facts.push({ type: 'goal', value: `Quer ${goals[1]} R$${goals[2]}` });
  }

  // Detectar informações de renda/trabalho
  const income = userMessage.match(/(ganho|recebo|meu salário é|trabalho como)\s+(.{5,50})/i);
  if (income) {
    facts.push({ type: 'income_info', value: income[0].substring(0, 100) });
  }

  // Salvar fatos (se houver e tabela existir)
  for (const fact of facts) {
    try {
      await pool.query(`
        INSERT INTO user_facts (user_id, fact_type, fact_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, fact_type)
        DO UPDATE SET fact_value = $3, updated_at = NOW()
      `, [userId, fact.type, fact.value]);

      logger.info({ userId, factType: fact.type }, 'User fact saved');
    } catch (e) {
      // Tabela pode não existir
    }
  }

  return facts;
}

/**
 * Formata contexto inteligente para o prompt
 */
export function formatSmartContextForPrompt(smartContext) {
  let contextStr = '';

  // Adicionar fatos do usuário
  if (smartContext.facts && smartContext.facts.length > 0) {
    contextStr += '\n\n## Informações conhecidas sobre o usuário:\n';
    smartContext.facts.forEach(f => {
      contextStr += `- ${f.fact_type}: ${f.fact_value}\n`;
    });
  }

  // Adicionar resumo da conversa anterior
  if (smartContext.summary) {
    contextStr += '\n\n## Resumo da conversa anterior:\n';
    contextStr += smartContext.summary;
  }

  return contextStr;
}

/**
 * Limpa memória antiga (manutenção)
 */
export async function cleanupOldMemory(userId, daysToKeep = 30) {
  try {
    // Limpar histórico antigo
    await pool.query(`
      DELETE FROM chat_history
      WHERE user_id = $1
        AND created_at < NOW() - make_interval(days => $2)
    `, [userId, parseInt(daysToKeep) || 30]);

    // Limpar resumos antigos
    await pool.query(`
      DELETE FROM conversation_summaries
      WHERE user_id = $1
        AND created_at < NOW() - INTERVAL '7 days'
    `, [userId]);

    logger.info({ userId, daysToKeep }, 'Old memory cleaned up');
  } catch (error) {
    logger.error({ err: error }, 'Error cleaning up memory');
  }
}

export default {
  getSmartContext,
  extractAndSaveFacts,
  formatSmartContextForPrompt,
  cleanupOldMemory,
};
