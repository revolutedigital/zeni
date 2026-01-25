import { callClaude, callClaudeVision, selectModel } from '../services/claude.js';
import { logger } from '../services/logger.js';
import {
  REGISTRAR_PROMPT,
  REGISTRAR_VISION_PROMPT,
  CFO_PROMPT,
  GUARDIAN_PROMPT,
  EDUCATOR_PROMPT,
  PLANNER_PROMPT,
  AGENT_METADATA
} from './prompts.js';
import {
  resolveShortResponse,
  getStateInstruction,
  extractStateFromResponse,
  PENDING_ACTIONS
} from '../services/conversationState.js';

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

// Padrões para planejamento de objetivos/metas
const PLANNER_PATTERNS = [
  /\b(meta|objetivo|sonho)\b/i,
  /\bquero (juntar|guardar|economizar|poupar|acumular)\b/i,
  /\bquero (comprar|viajar|fazer)\b/i,
  /\bcomo (chego|alcanço|consigo|junto)\b/i,
  /\bé possível (juntar|guardar|conseguir)\b/i,
  /\bquanto (falta|preciso|tempo)\b.*\b(meta|objetivo|comprar|viagem)\b/i,
  /\b(viagem|carro|casa|aposentadoria|faculdade|curso)\b.*\b(quanto|como|quando)\b/i,
  /\bplanej(ar|o|amento)\b/i,
  /\bminha meta\b/i,
  /\bmeu objetivo\b/i,
  // Padrões adicionais para capturar intenções de metas
  /\d+.*\b(pra|para)\s+(viagem|viajar|carro|casa|apartamento|moto|casamento|festa|intercâmbio)\b/i,
  /\b(viagem|viajar|carro|casa|apartamento|moto|casamento|festa|intercâmbio)\b.*\d+/i,
  /\bjuntar\s+\d+/i,
  /\bguardar\s+\d+/i,
  /\beconomizar\s+\d+/i,
  /\bpoupar\s+\d+/i,
  /\bpreciso\s+de\s+\d+.*\b(pra|para)\b/i,
];

// Padrões para análise CFO
const CFO_PATTERNS = [
  /\bcomo (estou|est[áa]|tô|to)\b/i,
  /\bcomo foi\b/i,  // "como foi meu 2024", "como foi o mês"
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
  // Perguntas sobre período/ano específico
  /\b(em|no|de|ano|total)\s+(20[2-3][0-9])\b/i,
  /\b(20[2-3][0-9])\s+(todo|inteiro|completo)\b/i,
  /\bgastei.*(20[2-3][0-9])\b/i,
  /\b(20[2-3][0-9]).*gastei\b/i,
  /\bmeu\s+(20[2-3][0-9])\b/i,  // "meu 2024", "meu 2025"
  /\bao total\b/i,
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

function hasPlannerIntent(input) {
  return PLANNER_PATTERNS.some(pattern => pattern.test(input));
}

// ============================================
// ROTEADOR PRINCIPAL
// ============================================

// Detectar contexto da conversa anterior para manter continuidade
function detectConversationContext(conversationHistory = []) {
  if (conversationHistory.length < 2) return null;

  // Pegar última resposta do assistente
  const lastAssistantMsg = [...conversationHistory]
    .reverse()
    .find(msg => msg.role === 'assistant')?.content?.toLowerCase() || '';

  // Detectar se a conversa anterior era sobre orçamento
  const isBudgetContext = /orçamento|budget|planejamento|definir.*limite|criar.*meta/i.test(lastAssistantMsg);

  // Detectar se era análise financeira
  const isAnalysisContext = /gastou|gasto|despesa|categoria|maiores|resumo/i.test(lastAssistantMsg);

  // Detectar se estava perguntando algo
  const wasAsking = /\?|quer|gostaria|posso ajudar|deseja/i.test(lastAssistantMsg);

  return { isBudgetContext, isAnalysisContext, wasAsking, lastAssistantMsg };
}

export function routeToAgent(userInput, context = {}, conversationHistory = [], conversationState = null) {
  const input = userInput.toLowerCase().trim();

  // Debug log
  logger.debug(`[Orchestrator] Input: "${input.substring(0, 50)}..."`);

  // Analisar contexto da conversa anterior
  const convContext = detectConversationContext(conversationHistory);

  // 1. Se tem imagem, vai pro registrador com vision
  if (context.hasImage) {
    logger.debug('[Orchestrator] → Agente: registrar_vision (imagem detectada)');
    return 'registrar_vision';
  }

  // 2. NOVO: Se há estado de conversa com ação pendente
  if (conversationState?.pendingAction) {
    const resolved = resolveShortResponse(input, conversationState);
    if (resolved) {
      logger.debug(`[Orchestrator] → Continuação de ação: ${resolved.action}`);
      // Criar orçamento vai pro CFO que sabe criar
      if (resolved.action === PENDING_ACTIONS.CREATE_BUDGET) {
        return 'cfo';
      }
      // Continuar com o agente anterior
      if (conversationState.lastAgent) {
        return conversationState.lastAgent;
      }
    }
  }

  // 3. Se é resposta curta a uma pergunta anterior, manter o agente
  const isShortResponse = input.length < 30 && /^(sim|não|quero|ok|isso|pode|claro|bora|vamos|por favor|ajuda|indica|recomenda)/i.test(input);

  if (isShortResponse && convContext?.wasAsking) {
    // Se estava falando de orçamento, continua com CFO (que cria orçamento)
    if (convContext.isBudgetContext) {
      logger.debug('[Orchestrator] → Agente: cfo (continuação - orçamento)');
      return 'cfo';
    }
    // Se estava fazendo análise, continua com CFO
    if (convContext.isAnalysisContext) {
      logger.debug('[Orchestrator] → Agente: cfo (continuação - análise)');
      return 'cfo';
    }
  }

  // 4. Detectar pedido de recomendação/sugestão após análise
  if (/o que.*(indica|recomenda|sugere|aconselha)|me (ajuda|ajude)|como (faço|fazer)/i.test(input)) {
    if (convContext?.isAnalysisContext || convContext?.isBudgetContext) {
      logger.debug('[Orchestrator] → Agente: cfo (pedido de recomendação)');
      return 'cfo';
    }
  }

  // 5. Se é sobre objetivos/metas financeiras
  if (hasPlannerIntent(input)) {
    logger.debug('[Orchestrator] → Agente: planner (objetivos/metas)');
    return 'planner';
  }

  // 6. PRIORIDADE: Se é análise financeira (CFO)
  if (hasCFOIntent(input)) {
    logger.debug('[Orchestrator] → Agente: cfo (análise financeira)');
    return 'cfo';
  }

  // 7. Se precisa de validação/consulta de gasto
  if (hasGuardianIntent(input, context)) {
    logger.debug('[Orchestrator] → Agente: guardian (consulta de gasto)');
    return 'guardian';
  }

  // 8. Se é pergunta conceitual/educacional
  if (hasEducationalIntent(input)) {
    logger.debug('[Orchestrator] → Agente: educator (pergunta educacional)');
    return 'educator';
  }

  // 9. Se parece uma transação (registro de gasto/receita)
  if (hasTransactionIntent(input)) {
    logger.debug('[Orchestrator] → Agente: registrar (transação detectada)');
    return 'registrar';
  }

  // 10. Default: CFO para perguntas gerais sobre finanças
  logger.debug('[Orchestrator] → Agente: cfo (default)');
  return 'cfo';
}

// ============================================
// EXECUTOR DE AGENTES
// ============================================

export async function executeAgent(agent, userInput, context = {}, conversationHistory = [], conversationState = null) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Formata contexto de dados para os agentes
  const contextStr = context.data
    ? `\n\nContexto financeiro atual:\n${JSON.stringify(context.data, null, 2)}`
    : '';

  // INTEGRAÇÃO: Smart Memory - adiciona contexto inteligente (fatos do usuário + resumo)
  const smartContextStr = context.smartContextStr || '';

  // Informações de data para o registrador
  const dateContext = `\n\nData de hoje: ${today}\nData de ontem: ${yesterday}`;

  // Limitar histórico para não exceder tokens (últimas 10 mensagens = 5 turnos)
  const recentHistory = conversationHistory.slice(-10);

  // Gerar instrução baseada no estado da conversa
  const resolvedIntent = conversationState ? resolveShortResponse(userInput, conversationState) : null;
  const stateInstruction = getStateInstruction(conversationState, userInput, resolvedIntent);

  logger.debug(`[Orchestrator] Executando agente: ${agent} (com ${recentHistory.length} msgs de histórico)`);
  if (stateInstruction) {
    logger.debug(`[Orchestrator] Instrução de estado adicionada: ${resolvedIntent?.action || 'contexto'}`);
  }

  switch (agent) {
    case 'registrar': {
      // Substitui placeholders de data no prompt
      let prompt = REGISTRAR_PROMPT
        .replace(/\{\{DATA_HOJE\}\}/g, today)
        .replace(/\{\{DATA_ONTEM\}\}/g, yesterday);
      prompt += dateContext;

      // Registrador não precisa de histórico longo
      return await callClaude(prompt, userInput, 'claude-3-haiku-20240307', []);
    }

    case 'registrar_vision': {
      let prompt = REGISTRAR_VISION_PROMPT + dateContext;
      return await callClaudeVision(prompt, context.imageBase64, context.mimeType);
    }

    case 'cfo': {
      // CFO recebe instrução de estado para saber como prosseguir
      // INTEGRAÇÃO: Smart Memory - inclui contexto inteligente
      const prompt = CFO_PROMPT + contextStr + smartContextStr + stateInstruction;
      // CFO recebe histórico para manter contexto de análise
      // SELEÇÃO DINÂMICA: modelo baseado na complexidade da mensagem
      const model = selectModel('cfo', userInput, recentHistory.length);
      return await callClaude(prompt, userInput, model, recentHistory);
    }

    case 'guardian': {
      // INTEGRAÇÃO: Smart Memory - inclui contexto inteligente
      const prompt = GUARDIAN_PROMPT + contextStr + smartContextStr + stateInstruction;
      // Guardian recebe histórico para criação de orçamento em múltiplos turnos
      const model = selectModel('guardian', userInput, recentHistory.length);
      return await callClaude(prompt, userInput, model, recentHistory);
    }

    case 'educator': {
      // Educador também recebe contexto para personalizar exemplos
      // INTEGRAÇÃO: Smart Memory - inclui contexto inteligente
      const prompt = EDUCATOR_PROMPT + contextStr + smartContextStr + stateInstruction;
      // SELEÇÃO DINÂMICA: modelo baseado na complexidade da pergunta
      const model = selectModel('educator', userInput, recentHistory.length);
      return await callClaude(prompt, userInput, model, recentHistory);
    }

    case 'planner': {
      // Planner recebe contexto de objetivos e dados financeiros
      // INTEGRAÇÃO: Smart Memory - inclui contexto inteligente
      const prompt = PLANNER_PROMPT + contextStr + smartContextStr + stateInstruction;
      // SELEÇÃO DINÂMICA: modelo baseado na complexidade do planejamento
      const model = selectModel('planner', userInput, recentHistory.length);
      return await callClaude(prompt, userInput, model, recentHistory);
    }

    default: {
      // Fallback para CFO
      logger.debug(`[Orchestrator] Agente desconhecido "${agent}", usando CFO`);
      const model = selectModel('cfo', userInput, recentHistory.length);
      return await callClaude(CFO_PROMPT + contextStr + smartContextStr + stateInstruction, userInput, model, recentHistory);
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
    model: 'claude-sonnet-4-20250514'
  };
}

export function listAgents() {
  return Object.entries(AGENT_METADATA).map(([id, info]) => ({
    id,
    ...info
  }));
}

// Re-exportar função de estado para uso no chat.js
export { extractStateFromResponse } from '../services/conversationState.js';

export default { routeToAgent, executeAgent, getAgentInfo, listAgents, extractStateFromResponse };
