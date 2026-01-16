import { callClaude, callClaudeVision } from '../services/claude.js';
import {
  REGISTRAR_PROMPT,
  REGISTRAR_VISION_PROMPT,
  CFO_PROMPT,
  GUARDIAN_PROMPT,
  EDUCATOR_PROMPT,
  AGENT_METADATA
} from './prompts.js';

// ============================================
// DETECTOR DE INTENÇÕES - Roteamento Inteligente
// ============================================

// Padrões para detectar intenção de registro de transação
const TRANSACTION_PATTERNS = [
  // Valores numéricos com contexto
  /\d+[.,]?\d*\s*(reais?|r\$|brl)?/i,
  /r\$\s*\d+/i,

  // Verbos de transação
  /\b(gastei|paguei|comprei|recebi|ganhei|transferi|depositei|saquei)\b/i,

  // Padrão simplificado "valor categoria"
  /^\d+\s+\w+$/,          // "50 mercado"
  /^\w+\s+\d+$/,          // "mercado 50"
  /^\d+[.,]\d{2}\s+\w+$/, // "50,00 mercado"

  // Categorias diretas com valor
  /\b(mercado|restaurante|ifood|uber|farmacia|luz|agua|gas|aluguel|salario)\b.*\d+/i,
  /\d+.*(mercado|restaurante|ifood|uber|farmacia|luz|agua|gas|aluguel)/i,
];

// Padrões para perguntas educacionais
const EDUCATIONAL_PATTERNS = [
  /\bo que [eé]\b/i,
  /\bcomo funciona\b/i,
  /\bme explica\b/i,
  /\bqual [ao] diferen[cç]a\b/i,
  /\bo que significa\b/i,
  /\bpra que serve\b/i,
  /\bcomo calcul/i,
  /\bvale a pena\b/i,
  /\b(cdi|selic|ipca|tesouro|cdb|lci|lca|fundo|a[çc][oõ]es?|fii|reserva de emerg[êe]ncia)\b/i,
];

// Padrões para consulta ao guardião
const GUARDIAN_PATTERNS = [
  /\bposso (gastar|comprar|pagar)\b/i,
  /\bda pra (gastar|comprar|pagar)\b/i,
  /\btenho (dinheiro|grana|verba) pra\b/i,
  /\bcabe no or[çc]amento\b/i,
  /\bvou (gastar|comprar|pagar)\b/i,
  /\bquero (gastar|comprar|pagar)\b/i,
  /\bpreciso (gastar|comprar|pagar)\b/i,
];

// Padrões para análise CFO
const CFO_PATTERNS = [
  /\bcomo (estou|est[áa]|tô|to)\b/i,
  /\bresume?\b/i,
  /\bresumo\b/i,
  /\bquanto gastei\b/i,
  /\bquanto gasto\b/i,
  /\bonde (mais )?(gasto|gastei)\b/i,
  /\banalise?\b/i,
  /\bmeus gastos\b/i,
  /\bminhas finan[çc]as\b/i,
  /\best(ou|á) no (vermelho|azul)\b/i,
  /\bsaldo\b/i,
  /\bsobrou\b/i,
  /\bfaltou\b/i,
  /\bbalanco\b/i,
  /\bcomparativo\b/i,
  /\besse m[êe]s\b/i,
  /\bm[êe]s passado\b/i,
];

// ============================================
// FUNÇÕES DE DETECÇÃO
// ============================================

function hasTransactionIntent(input) {
  return TRANSACTION_PATTERNS.some(pattern => pattern.test(input));
}

function hasEducationalIntent(input) {
  return EDUCATIONAL_PATTERNS.some(pattern => pattern.test(input));
}

function hasGuardianIntent(input, context) {
  // Se pergunta explícita sobre gastar
  if (GUARDIAN_PATTERNS.some(pattern => pattern.test(input))) {
    return true;
  }

  // Se há alertas de orçamento estourado E a mensagem menciona a categoria
  if (context?.budgetAlerts?.length > 0) {
    const alertCategories = context.budgetAlerts.map(a => a.category.toLowerCase());
    const inputLower = input.toLowerCase();
    if (alertCategories.some(cat => inputLower.includes(cat.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

function hasCFOIntent(input) {
  return CFO_PATTERNS.some(pattern => pattern.test(input));
}

// ============================================
// ROTEADOR PRINCIPAL
// ============================================

export function routeToAgent(userInput, context = {}) {
  const input = userInput.toLowerCase().trim();

  // Debug log (pode ser removido em produção)
  console.log(`[Orchestrator] Input: "${input.substring(0, 50)}..."`);

  // 1. Se tem imagem, vai pro registrador com vision
  if (context.hasImage) {
    console.log('[Orchestrator] → Agente: registrar_vision (imagem detectada)');
    return 'registrar_vision';
  }

  // 2. Se parece claramente uma transação, vai pro registrador
  if (hasTransactionIntent(input) && !hasCFOIntent(input) && !hasGuardianIntent(input, context)) {
    console.log('[Orchestrator] → Agente: registrar (transação detectada)');
    return 'registrar';
  }

  // 3. Se precisa de validação/consulta de gasto
  if (hasGuardianIntent(input, context)) {
    console.log('[Orchestrator] → Agente: guardian (consulta de gasto)');
    return 'guardian';
  }

  // 4. Se é pergunta conceitual/educacional
  if (hasEducationalIntent(input)) {
    console.log('[Orchestrator] → Agente: educator (pergunta educacional)');
    return 'educator';
  }

  // 5. Se é análise financeira explícita
  if (hasCFOIntent(input)) {
    console.log('[Orchestrator] → Agente: cfo (análise financeira)');
    return 'cfo';
  }

  // 6. Default: CFO para perguntas gerais sobre finanças
  console.log('[Orchestrator] → Agente: cfo (default)');
  return 'cfo';
}

// ============================================
// EXECUTOR DE AGENTES
// ============================================

export async function executeAgent(agent, userInput, context = {}) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Formata contexto de dados para os agentes
  const contextStr = context.data
    ? `\n\nContexto financeiro atual:\n${JSON.stringify(context.data, null, 2)}`
    : '';

  // Informações de data para o registrador
  const dateContext = `\n\nData de hoje: ${today}\nData de ontem: ${yesterday}`;

  console.log(`[Orchestrator] Executando agente: ${agent}`);

  switch (agent) {
    case 'registrar': {
      // Substitui placeholders de data no prompt
      let prompt = REGISTRAR_PROMPT
        .replace(/\{\{DATA_HOJE\}\}/g, today)
        .replace(/\{\{DATA_ONTEM\}\}/g, yesterday);
      prompt += dateContext;

      return await callClaude(prompt, userInput, 'claude-3-haiku-20240307');
    }

    case 'registrar_vision': {
      let prompt = REGISTRAR_VISION_PROMPT + dateContext;
      return await callClaudeVision(prompt, context.imageBase64, context.mimeType);
    }

    case 'cfo': {
      const prompt = CFO_PROMPT + contextStr;
      return await callClaude(prompt, userInput, 'claude-3-5-sonnet-20241022');
    }

    case 'guardian': {
      const prompt = GUARDIAN_PROMPT + contextStr;
      return await callClaude(prompt, userInput, 'claude-3-5-sonnet-20241022');
    }

    case 'educator': {
      // Educador também recebe contexto para personalizar exemplos
      const prompt = EDUCATOR_PROMPT + contextStr;
      return await callClaude(prompt, userInput, 'claude-3-haiku-20240307');
    }

    default: {
      // Fallback para CFO
      console.log(`[Orchestrator] Agente desconhecido "${agent}", usando CFO`);
      return await callClaude(CFO_PROMPT + contextStr, userInput, 'claude-3-5-sonnet-20241022');
    }
  }
}

// ============================================
// FUNÇÕES AUXILIARES EXPORTADAS
// ============================================

export function getAgentInfo(agentId) {
  return AGENT_METADATA[agentId] || {
    name: 'Zeni',
    emoji: '🤖',
    description: 'Assistente financeiro',
    model: 'claude-3-5-sonnet-20241022'
  };
}

export function listAgents() {
  return Object.entries(AGENT_METADATA).map(([id, info]) => ({
    id,
    ...info
  }));
}

export default { routeToAgent, executeAgent, getAgentInfo, listAgents };
