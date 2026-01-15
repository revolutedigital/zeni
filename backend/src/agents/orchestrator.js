import { callClaude, callClaudeVision } from '../services/claude.js';
import {
  REGISTRAR_PROMPT,
  REGISTRAR_VISION_PROMPT,
  CFO_PROMPT,
  GUARDIAN_PROMPT,
  EDUCATOR_PROMPT
} from './prompts.js';

// Detecta se é intenção de registrar transação
function hasTransactionIntent(input) {
  const patterns = [
    /\d+.*reais?/i,
    /r\$\s*\d+/i,
    /gastei|paguei|comprei|recebi|gasto|pagamento/i,
    /^\d+\s+\w+/,  // "50 mercado"
    /^\w+\s+\d+/,  // "mercado 50"
  ];
  return patterns.some(p => p.test(input));
}

// Detecta se é pergunta educacional
function hasEducationalIntent(input) {
  const patterns = [
    /o que [eé]/i,
    /como funciona/i,
    /me explica/i,
    /qual a diferen[cç]a/i,
    /significa/i,
  ];
  return patterns.some(p => p.test(input));
}

// Detecta se precisa do guardião
function needsGuardian(input, context) {
  // Se pergunta "posso gastar"
  if (/posso (gastar|comprar)/i.test(input)) return true;

  // Se contexto indica categoria estourada
  if (context?.budgetAlerts?.length > 0) return true;

  return false;
}

// Determina qual agente usar
export function routeToAgent(userInput, context = {}) {
  const input = userInput.toLowerCase().trim();

  // Se tem imagem, vai pro registrador com vision
  if (context.hasImage) {
    return 'registrar_vision';
  }

  // Se parece transação, vai pro registrador
  if (hasTransactionIntent(input)) {
    return 'registrar';
  }

  // Se precisa de alerta/validação
  if (needsGuardian(input, context)) {
    return 'guardian';
  }

  // Se é pergunta conceitual
  if (hasEducationalIntent(input)) {
    return 'educator';
  }

  // Default: CFO para análises e perguntas gerais
  return 'cfo';
}

// Executa o agente apropriado
export async function executeAgent(agent, userInput, context = {}) {
  const today = new Date().toISOString().split('T')[0];
  const contextStr = context.data ? `\n\nContexto atual:\n${JSON.stringify(context.data, null, 2)}` : '';

  switch (agent) {
    case 'registrar':
      const registrarPrompt = REGISTRAR_PROMPT + `\n\nData de hoje: ${today}`;
      return await callClaude(registrarPrompt, userInput, 'claude-3-haiku-20240307');

    case 'registrar_vision':
      return await callClaudeVision(REGISTRAR_VISION_PROMPT, context.imageBase64, context.mimeType);

    case 'cfo':
      const cfoPrompt = CFO_PROMPT + contextStr;
      return await callClaude(cfoPrompt, userInput, 'claude-3-5-sonnet-20241022');

    case 'guardian':
      const guardianPrompt = GUARDIAN_PROMPT + contextStr;
      return await callClaude(guardianPrompt, userInput, 'claude-3-5-sonnet-20241022');

    case 'educator':
      return await callClaude(EDUCATOR_PROMPT, userInput, 'claude-3-haiku-20240307');

    default:
      return await callClaude(CFO_PROMPT + contextStr, userInput, 'claude-3-5-sonnet-20241022');
  }
}

export default { routeToAgent, executeAgent };
