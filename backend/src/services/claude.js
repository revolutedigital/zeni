import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// CONFIGURATION
// ============================================

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

const MODEL_CONFIG = {
  fast: 'claude-3-haiku-20240307',
  balanced: 'claude-sonnet-4-20250514',
  powerful: 'claude-sonnet-4-20250514',
};

// ============================================
// COMPLEXITY ANALYSIS
// ============================================

/**
 * Calcula a complexidade de uma mensagem para seleção de modelo
 * @returns {number} Score de 0 a 1
 */
export function calculateMessageComplexity(message, contextLength = 0) {
  const factors = [];

  // Fator 1: Comprimento da mensagem
  factors.push(message.length > 200 ? 0.2 : message.length > 100 ? 0.1 : 0);

  // Fator 2: Palavras que indicam análise complexa
  const complexPatterns = [
    /\b(analise|analis[ae]|compare|compar[ae]|explique|porque|como|por que)\b/i,
    /\b(tendência|padrão|projeção|previsão|cenário)\b/i,
    /\b(estratégia|planejamento|otimiz[ae]|recomend[ae])\b/i,
  ];
  factors.push(complexPatterns.filter(p => p.test(message)).length * 0.15);

  // Fator 3: Referências temporais (análises de período)
  const temporalPatterns = [
    /\b(20[2-3][0-9]|ano|mês|semana|período|trimestre)\b/i,
    /\b(comparar|histórico|evolução|últimos)\b/i,
  ];
  factors.push(temporalPatterns.filter(p => p.test(message)).length * 0.1);

  // Fator 4: Múltiplas perguntas
  const questionCount = (message.match(/\?/g) || []).length;
  factors.push(questionCount > 1 ? 0.2 : 0);

  // Fator 5: Contexto longo (histórico de conversa)
  factors.push(contextLength > 15 ? 0.2 : contextLength > 8 ? 0.1 : 0);

  // Soma com cap em 1.0
  return Math.min(factors.reduce((a, b) => a + b, 0), 1.0);
}

/**
 * Seleciona o modelo apropriado baseado no agente e complexidade
 */
export function selectModel(agent, message, contextLength = 0) {
  const complexity = calculateMessageComplexity(message, contextLength);

  // Registrador sempre usa Haiku (rápido, estruturado)
  if (agent === 'registrar' || agent === 'registrar_vision') {
    return MODEL_CONFIG.fast;
  }

  // CFO com análises complexas ou histórico longo → Sonnet
  if (agent === 'cfo' && complexity > 0.5) {
    logger.debug({ agent, complexity }, 'Using balanced model for complex CFO analysis');
    return MODEL_CONFIG.balanced;
  }

  // Educator com perguntas complexas → Sonnet
  if (agent === 'educator' && complexity > 0.4) {
    logger.debug({ agent, complexity }, 'Using balanced model for complex education');
    return MODEL_CONFIG.balanced;
  }

  // Planner para análise de viabilidade complexa → Sonnet
  if (agent === 'planner' && complexity > 0.5) {
    logger.debug({ agent, complexity }, 'Using balanced model for complex planning');
    return MODEL_CONFIG.balanced;
  }

  // Default: Haiku (rápido e econômico)
  return MODEL_CONFIG.fast;
}

// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================

/**
 * Calcula delay com exponential backoff + jitter
 */
function calculateBackoffDelay(attempt) {
  const exponentialDelay = Math.pow(2, attempt) * RETRY_CONFIG.baseDelayMs;
  const jitter = Math.random() * RETRY_CONFIG.baseDelayMs;
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);
}

/**
 * Verifica se o erro é retryable
 */
function isRetryableError(error) {
  // Rate limiting
  if (error.status === 429) return true;

  // Server errors (5xx)
  if (error.status >= 500) return true;

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;

  // Overloaded
  if (error.error?.type === 'overloaded_error') return true;

  return false;
}

/**
 * Executa chamada com retry logic
 */
async function executeWithRetry(fn, context = {}) {
  let lastError;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxRetries - 1) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt);
      logger.warn(
        { attempt: attempt + 1, delay, error: error.message, ...context },
        'Retrying Claude API call after error'
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Chamar Claude com modelo específico
 * Agora suporta histórico de conversa, retry logic e seleção dinâmica
 */
export async function callClaude(systemPrompt, userMessage, model = 'claude-3-haiku-20240307', conversationHistory = []) {
  // Construir array de mensagens com histórico
  const messages = [
    // Histórico anterior (últimas mensagens)
    ...conversationHistory
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({ role: msg.role, content: msg.content })),
    // Mensagem atual do usuário
    { role: 'user', content: userMessage }
  ];

  const apiCall = async () => {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    return response.content[0].text;
  };

  try {
    return await executeWithRetry(apiCall, { model, messageLength: userMessage.length });
  } catch (error) {
    logger.error({ error, model }, 'Error calling Claude API after retries');
    throw error;
  }
}

/**
 * Wrapper que seleciona modelo automaticamente baseado no agente e complexidade
 */
export async function callClaudeWithAutoModel(agent, systemPrompt, userMessage, conversationHistory = []) {
  const model = selectModel(agent, userMessage, conversationHistory.length);
  logger.debug({ agent, model, historyLength: conversationHistory.length }, 'Auto-selected model for agent');
  return callClaude(systemPrompt, userMessage, model, conversationHistory);
}

/**
 * Chamar Claude com imagem (Vision)
 * Inclui retry logic para resiliência
 */
export async function callClaudeVision(systemPrompt, imageBase64, mimeType = 'image/jpeg') {
  const apiCall = async () => {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Extraia os dados desta imagem de comprovante financeiro.',
            },
          ],
        },
      ],
    });

    return response.content[0].text;
  };

  try {
    return await executeWithRetry(apiCall, { model: 'claude-3-haiku-20240307', type: 'vision' });
  } catch (error) {
    logger.error({ error }, 'Error calling Claude Vision API after retries');
    throw error;
  }
}

export default {
  callClaude,
  callClaudeVision,
  callClaudeWithAutoModel,
  selectModel,
  calculateMessageComplexity,
};
