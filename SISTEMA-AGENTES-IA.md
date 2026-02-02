# 🤖 Sistema Multi-Agente de IA - Zeni

## 📚 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Os 6 Agentes Especializados](#os-6-agentes-especializados)
4. [Fluxo de Execução](#fluxo-de-execução)
5. [Roteamento Inteligente](#roteamento-inteligente)
6. [Seleção Dinâmica de Modelo](#seleção-dinâmica-de-modelo)
7. [Gerenciamento de Estado](#gerenciamento-de-estado)
8. [Integração Claude API](#integração-claude-api)
9. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 VISÃO GERAL

O Zeni utiliza uma **arquitetura multi-agente** onde cada agente de IA é especializado em uma tarefa específica. Isso traz vários benefícios:

### Por que Multi-Agente?

✅ **Especialização**: Cada agente é expert em sua área
✅ **Prompts Otimizados**: Instruções específicas para cada contexto
✅ **Custo Eficiente**: Usa modelos mais baratos quando possível
✅ **Melhor UX**: Respostas mais precisas e relevantes
✅ **Escalabilidade**: Fácil adicionar novos agentes

### Diferencial Competitivo

A maioria das fintechs usa um único chatbot genérico. O Zeni tem **6 especialistas** trabalhando juntos, como uma equipe financeira de verdade.

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                      USUÁRIO                                │
│              "Quero juntar 15000 pra viagem"                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                              │
│              (Roteador Inteligente)                         │
│                                                             │
│  1. Analisa intenção do usuário                            │
│  2. Detecta padrões via regex                              │
│  3. Considera contexto da conversa                         │
│  4. Seleciona o agente apropriado                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────┬──────────┬──────────┬──────────┬──────────┐
             ▼          ▼          ▼          ▼          ▼          ▼
         ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐
         │  📝 │    │  📷 │    │  📊 │    │  🛡️ │    │  📚 │    │  🎯 │
         │REG. │    │VIS. │    │ CFO │    │GUAR │    │ EDU │    │PLAN │
         └─────┘    └─────┘    └─────┘    └─────┘    └─────┘    └─────┘
             │          │          │          │          │          │
             └──────────┴──────────┴──────────┴──────────┴──────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   CLAUDE API             │
                    │   (Haiku ou Sonnet)      │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   RESPOSTA PROCESSADA    │
                    │   - Texto ao usuário     │
                    │   - Ações no banco       │
                    │   - Estado atualizado    │
                    └──────────────────────────┘
```

### Componentes Principais

| Componente | Arquivo | Responsabilidade |
|------------|---------|------------------|
| **Orchestrator** | [orchestrator.js](backend/src/agents/orchestrator.js) | Roteamento e execução de agentes |
| **Prompts** | [prompts.js](backend/src/agents/prompts.js) | System prompts de cada agente (7000+ linhas) |
| **Claude Service** | [claude.js](backend/src/services/claude.js) | Integração com API, retry logic, seleção de modelo |
| **Conversation State** | [conversationState.js](backend/src/services/conversationState.js) | Gerenciamento de estado multi-turno |
| **Chat Router** | [chat.js](backend/src/routes/chat.js) | Endpoint HTTP, persistência de ações |

---

## 🤖 OS 6 AGENTES ESPECIALIZADOS

### 1. 📝 REGISTRADOR (Registrar)

**Especialidade:** Extrair transações de linguagem natural

**Modelo:** Claude 3 Haiku (sempre) - Rápido e determinístico

**Quando é acionado:**
- Mensagens com valores: "50 mercado", "gastei 100"
- Verbos de transação: "paguei", "comprei", "recebi"
- Padrões simples: número + categoria

**O que faz:**
1. Analisa o texto usando Chain-of-Thought
2. Identifica: valor, tipo (receita/despesa), categoria, data, descrição
3. Retorna JSON estruturado
4. Sistema persiste a transação no banco

**Exemplo de Conversa:**
```
Usuário: "50 mercado"

REGISTRADOR analisa:
1. Valor: 50
2. Tipo: despesa (default)
3. Categoria: Mercado
4. Data: hoje
5. Descrição: "Compras no mercado"

Retorna JSON:
{
  "success": true,
  "transaction": {
    "amount": 50.00,
    "type": "expense",
    "category": "Mercado",
    "description": "Compras no mercado",
    "date": "2026-02-01",
    "paid": true
  },
  "confirmation": "✅ R$50,00 em Mercado registrado (pago)."
}

Sistema salva no banco e mostra: "✅ R$50,00 em Mercado registrado!"
```

**Campo Crítico - `paid`:**
- `true`: Já foi pago ("gastei 100", "paguei luz")
- `false`: Pendente ("vou pagar", "tenho que pagar", datas futuras)

**Categorias Reconhecidas:**
Mercado, Restaurante, Salão/Estética, Limpeza, Casa, Financiamento, Saúde, Educação, Carro, Ajuda Família, Vestuário, Investimento, Lazer/Passeio, Cartão de Crédito, Salário, Outros

---

### 2. 📷 REGISTRADOR VISUAL (Registrar Vision)

**Especialidade:** OCR de comprovantes financeiros

**Modelo:** Claude 3 Haiku com Vision

**Quando é acionado:**
- Usuário envia imagem (upload de foto)

**Tipos de comprovante que analisa:**
1. **Cupom Fiscal** → Extrai valor total, estabelecimento
2. **Comprovante PIX** → Valor, favorecido, data/hora
3. **Fatura de Cartão** → Total da fatura
4. **Boleto** → Valor, beneficiário, vencimento
5. **Nota Bancária** → Valor, descrição

**Inferência Inteligente de Categoria:**
- Extra, Carrefour → Mercado
- iFood, Rappi → Restaurante
- Drogaria, Farmácia → Saúde
- Shell, Ipiranga → Carro
- Renner, C&A → Vestuário

**Confiança da Extração:**
- `high`: Tudo claro, cria automaticamente
- `medium`: Pede confirmação ao usuário
- `low`: Imagem ilegível, pede reenvio

---

### 3. 📊 CFO (Chief Financial Officer)

**Especialidade:** Análises financeiras e gestão de orçamento

**Modelo:** Haiku (padrão) ou Sonnet (se complexidade > 0.5)

**Quando é acionado:**
- "Como estou?", "Resume meu mês"
- "Quanto gastei?", "Onde mais gasto?"
- Criação de orçamentos
- Recomendações financeiras

**Principais Funcionalidades:**

1. **Resumo Financeiro**
   - Gasto total vs orçado
   - Percentual usado
   - Categorias que estouraram
   - Projeções

2. **Criação de Orçamento** (Fluxo Multi-Turno)
   ```
   Turno 1: Diagnóstico
   "Você ainda não tem orçamento. Gastou R$15.400 este mês.
   Maiores gastos: Casa R$10k, Mercado R$2.1k
   Quer ajuda pra criar?"

   Turno 2: Se usuário diz "sim"
   "Sugiro esses limites:
   📊 Casa: R$10.000
   📊 Mercado: R$2.500
   📊 Restaurante: R$1.500
   Total: R$14.000/mês
   Quer que eu defina?"

   Turno 3: Se usuário confirma
   Retorna JSON → Sistema cria budgets no banco
   ```

3. **Recomendações Acionáveis**
   - Não repete dados
   - Foca no "próximo passo"
   - Específico, não genérico

**Regra Crítica:** NUNCA repetir informações já ditas. Sempre avançar a conversa.

**Contexto Recebido:**
```javascript
{
  month: 2,
  year: 2026,
  totalBudget: 45000,      // Total orçado
  expenses: 30000,         // Total gasto
  remaining: 15000,        // Saldo disponível
  income: 45000,
  balance: 15000,
  byCategory: [
    {name: "Casa", spent: 10000, budget: 10000, percentUsed: 100},
    {name: "Mercado", spent: 800, budget: 1500, percentUsed: 53}
  ],
  budgetAlerts: [...]      // Categorias estouradas
}
```

---

### 4. 🛡️ GUARDIÃO (Guardian)

**Especialidade:** Validação de gastos sem julgamento

**Modelo:** Haiku

**Quando é acionado:**
- "Posso gastar X?"
- "Dá pra comprar Y?"
- "Tenho dinheiro pra Z?"

**Framework F.A.P.:**
1. **Fato**: Estado atual do orçamento
2. **Análise**: O que acontece se gastar
3. **Pergunta**: Devolve decisão ao usuário

**Exemplo:**
```
Usuário: "Posso gastar 500 num tênis?"

GUARDIÃO responde:
📊 Fato: Você tem R$2.300 sobrando este mês em Vestuário.

🔍 Análise: Gastando R$500, ficaria com R$1.800.
Isso é 22% do orçamento de Vestuário.

❓ Você decide: Cabe tranquilo no orçamento.
O que você acha?
```

**Níveis de Urgência:**
- 🟢 **Tranquilo**: < 70% do orçamento usado
- 🟡 **Atenção**: 70-90% do orçamento usado
- 🔴 **Alerta**: > 90% ou estourado

**Frases Proibidas:**
- "Você não deveria"
- "Não é boa ideia"
- "Isso é irresponsável"

**Tom:** Informativo, nunca julgador. Sempre devolve a decisão ao usuário.

---

### 5. 📚 EDUCADOR (Educator)

**Especialidade:** Educação financeira brasileira

**Modelo:** Haiku (padrão) ou Sonnet (perguntas complexas)

**Quando é acionado:**
- "O que é CDI?"
- "Como funciona o Tesouro Direto?"
- "Vale a pena LCI?"
- "Qual diferença entre X e Y?"

**Framework E.E.A.:**
1. **Explicação**: Conceito de forma simples
2. **Exemplo**: Caso prático com números
3. **Aplicação**: Como usar na vida real

**Domínios Cobertos:**
- CDI, Selic, IPCA
- Tesouro Direto, CDB, LCI/LCA
- Ações, FIIs, Fundos
- Reserva de emergência
- Juros compostos
- Cartão de crédito

**Exemplo:**
```
Usuário: "O que é CDI?"

EDUCADOR responde:

📚 Explicação:
CDI (Certificado de Depósito Interbancário) é a taxa que os bancos
usam pra emprestar dinheiro entre si. É tipo a "régua" pra medir
investimentos de renda fixa no Brasil.

💡 Exemplo:
Se o CDI tá em 12% ao ano e você investe R$10.000 num CDB que paga
100% do CDI, em 1 ano você teria R$11.200 (aproximado).

🎯 Aplicação:
Quando for investir, compare:
- CDB pagando 100% do CDI → bom
- CDB pagando 80% do CDI → fraco
- Poupança → rende só 70% do CDI

Quer saber sobre algum investimento específico?
```

**Tom:** Simples, não condescendente. Professor que você gostaria de ter.

---

### 6. 🎯 PLANEJADOR (Planner)

**Especialidade:** Objetivos e metas financeiras

**Modelo:** Haiku (padrão) ou Sonnet (análise complexa)

**Quando é acionado:**
- "Quero juntar X"
- "Meta de Y"
- "Como consigo comprar Z?"
- "Quanto falta pro meu objetivo?"

**Principais Funções:**

1. **Criar Objetivo**
   - Coleta: nome, valor, prazo
   - Calcula viabilidade
   - Sugere contribuição mensal
   - Retorna JSON → Sistema salva

2. **Consultar Objetivo**
   - Mostra progresso (R$ e %)
   - Prazo restante
   - Contribuição atual
   - Previsão de conclusão

3. **Análise de Viabilidade**
   ```
   Margem disponível = Renda - Gastos - Outros compromissos
   % da margem = Contribuição necessária / Margem disponível

   Score:
   - Fácil: < 30% da margem
   - Médio: 30-60% da margem
   - Difícil: 60-90% da margem
   - Muito Difícil: > 90% da margem
   ```

**Contexto Recebido:**
```javascript
{
  goals: [
    {
      name: "Viagem Europa",
      targetAmount: 15000,
      currentAmount: 3500,
      progressPercent: 23.3,
      deadline: "2026-12-01",
      daysRemaining: 303
    }
  ],
  monthlyIncome: 8000,
  availableMargin: 2000,        // Renda - Gastos
  existingCommitments: 1200     // Já comprometido com outros goals
}
```

**Categorias de Objetivo:**
- `savings`: Reserva de emergência
- `travel`: Viagem
- `purchase`: Compra (carro, casa, eletrônico)
- `debt`: Quitar dívida
- `investment`: Investimento
- `education`: Curso, faculdade
- `other`: Outros

**Exemplo Completo:**
```
Usuário: "Quero juntar 15000 pra uma viagem pra Europa até dezembro"

PLANNER analisa:
- Nome: Viagem Europa
- Valor: R$15.000
- Prazo: 10 meses (fev a dez)
- Contribuição necessária: R$1.500/mês
- Margem disponível: R$2.000/mês
- % da margem: 75% (difícil)

Retorna JSON:
{
  "action": "create_goal",
  "goal": {
    "name": "Viagem Europa",
    "targetAmount": 15000,
    "deadline": "2026-12-01",
    "priority": "high",
    "category": "travel"
  },
  "message": "🎯 Objetivo criado! Você precisa guardar R$1.500/mês (75% da sua margem). É desafiador mas possível!"
}

Sistema salva no banco e confirma ao usuário.
```

---

## 🔀 FLUXO DE EXECUÇÃO

### Passo a Passo Completo

```
1. USUÁRIO envia mensagem
   ↓
2. CHAT ROUTER recebe no POST /api/chat
   ↓
3. Busca CONTEXTO do usuário (getUserContext)
   - Transações recentes
   - Orçamentos
   - Objetivos
   - Margem disponível
   ↓
4. Busca ESTADO DA CONVERSA (getConversationState)
   - Ações pendentes
   - Último agente
   - Histórico resumido
   ↓
5. ORCHESTRATOR roteia (routeToAgent)
   - Analisa padrões regex
   - Verifica contexto da conversa
   - Detecta continuação de fluxo
   - Retorna: 'registrar', 'cfo', 'planner', etc.
   ↓
6. ORCHESTRATOR executa (executeAgent)
   - Seleciona modelo (Haiku ou Sonnet)
   - Monta prompt do sistema
   - Injeta contexto + histórico
   - Chama Claude API
   ↓
7. CLAUDE API processa
   - Usa retry logic (até 3 tentativas)
   - Retorna resposta em texto
   ↓
8. CHAT ROUTER processa resposta
   - Se REGISTRADOR → extrai JSON, salva transação
   - Se PLANNER → extrai JSON, cria objetivo
   - Se CFO → extrai JSON, cria orçamentos
   ↓
9. Atualiza ESTADO DA CONVERSA
   - Extrai estado da resposta
   - Salva no banco (conversation_state)
   ↓
10. Salva HISTÓRICO
    - Mensagem do usuário
    - Resposta do agente
    - Tabela: chat_history
    ↓
11. RETORNA ao usuário
    {
      agent: 'planner',
      response: '🎯 Objetivo criado!',
      context: { month, year, expenses, ... }
    }
```

### Código Simplificado

```javascript
// 1. Recebe mensagem
router.post('/chat', async (req, res) => {
  const { message } = req.body;

  // 2. Busca contexto
  const context = await getUserContext(req.userId, message);
  const conversationState = await getConversationState(req.userId);

  // 3. Roteia para agente
  const agent = routeToAgent(message, context, history, conversationState);

  // 4. Executa agente
  let response = await executeAgent(agent, message, context, history, conversationState);

  // 5. Processa ações (criar objetivo, orçamento, etc)
  if (agent === 'planner') {
    const parsed = extractJSON(response, 'create_goal');
    if (parsed?.action === 'create_goal') {
      // Salva no banco
      await createGoal(parsed.goal);
      response = parsed.message;
    }
  }

  // 6. Retorna
  res.json({ agent, response, context });
});
```

---

## 🎯 ROTEAMENTO INTELIGENTE

### Como o Orchestrator Decide qual Agente Usar?

O roteamento acontece em **ordem de prioridade**:

```javascript
function routeToAgent(userInput, context, history, state) {
  const input = userInput.toLowerCase();

  // 1. IMAGEM → registrar_vision
  if (context.hasImage) return 'registrar_vision';

  // 2. AÇÃO PENDENTE → continua o fluxo
  if (state?.pendingAction === 'CREATE_BUDGET') return 'cfo';

  // 3. RESPOSTA CURTA a pergunta → mantém agente
  if (isShortResponse(input) && wasAsking(history)) {
    if (isBudgetContext(history)) return 'cfo';
  }

  // 4. OBJETIVOS/METAS → planner
  if (PLANNER_PATTERNS.some(p => p.test(input))) return 'planner';

  // 5. ANÁLISE FINANCEIRA → cfo
  if (CFO_PATTERNS.some(p => p.test(input))) return 'cfo';

  // 6. VALIDAÇÃO DE GASTO → guardian
  if (GUARDIAN_PATTERNS.some(p => p.test(input))) return 'guardian';

  // 7. PERGUNTA EDUCACIONAL → educator
  if (EDUCATIONAL_PATTERNS.some(p => p.test(input))) return 'educator';

  // 8. TRANSAÇÃO → registrar
  if (TRANSACTION_PATTERNS.some(p => p.test(input))) return 'registrar';

  // 9. DEFAULT → cfo
  return 'cfo';
}
```

### Exemplos de Padrões

**PLANNER_PATTERNS:**
```regex
/\b(meta|objetivo|sonho)\b/i
/\bquero (juntar|guardar|economizar)\b/i
/\b15000.*viagem\b/i
/\bviagem.*15000\b/i
```

**CFO_PATTERNS:**
```regex
/\bcomo (estou|tô)\b/i
/\bquanto gastei\b/i
/\bonde mais gasto\b/i
/\b2024.*total\b/i
```

**TRANSACTION_PATTERNS:**
```regex
/^\d+\s+\w+$/           // "50 mercado"
/\bgastei\b.*\d+/i      // "gastei 100"
/\d+.*mercado/i         // "100 mercado"
```

### Contexto de Conversa

O sistema detecta **continuidade de conversa**:

```javascript
// Última mensagem do assistente perguntou algo?
const wasAsking = /\?|quer|gostaria|posso ajudar/.test(lastMessage);

// Conversa era sobre orçamento?
const isBudgetContext = /orçamento|budget|planejamento/.test(lastMessage);

// Se usuário responde "sim", mantém o agente anterior
if (wasAsking && input === "sim") {
  return state.lastAgent;
}
```

---

## ⚙️ SELEÇÃO DINÂMICA DE MODELO

### Por que Mudar de Modelo?

Claude oferece modelos com diferentes **custo vs capacidade**:

| Modelo | Velocidade | Custo (MTok) | Uso Ideal |
|--------|------------|--------------|-----------|
| **Haiku** | Muito rápido | $0.80 input / $2.40 output | Tarefas estruturadas, respostas simples |
| **Sonnet 4** | Moderado | $3.00 input / $15.00 output | Análises complexas, raciocínio avançado |

**Estratégia:** Usar Haiku sempre que possível, Sonnet apenas quando necessário.

### Cálculo de Complexidade

```javascript
function calculateMessageComplexity(message, contextLength) {
  let score = 0;

  // Fator 1: Tamanho da mensagem
  if (message.length > 200) score += 0.2;
  else if (message.length > 100) score += 0.1;

  // Fator 2: Palavras que indicam análise complexa
  if (/analise|compare|explique/.test(message)) score += 0.15;
  if (/tendência|padrão|projeção/.test(message)) score += 0.15;

  // Fator 3: Referências temporais
  if (/20[2-3][0-9]|histórico/.test(message)) score += 0.1;

  // Fator 4: Múltiplas perguntas
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount > 1) score += 0.2;

  // Fator 5: Contexto longo
  if (contextLength > 15) score += 0.2;
  else if (contextLength > 8) score += 0.1;

  return Math.min(score, 1.0); // Cap em 1.0
}
```

### Regras de Seleção

```javascript
function selectModel(agent, message, contextLength) {
  const complexity = calculateMessageComplexity(message, contextLength);

  // REGISTRADOR: sempre Haiku
  if (agent === 'registrar' || agent === 'registrar_vision') {
    return 'claude-3-haiku-20240307';
  }

  // CFO: Sonnet se complexidade > 0.5
  if (agent === 'cfo' && complexity > 0.5) {
    return 'claude-sonnet-4-20250514';
  }

  // EDUCATOR: Sonnet se complexidade > 0.4
  if (agent === 'educator' && complexity > 0.4) {
    return 'claude-sonnet-4-20250514';
  }

  // PLANNER: Sonnet se complexidade > 0.5
  if (agent === 'planner' && complexity > 0.5) {
    return 'claude-sonnet-4-20250514';
  }

  // Default: Haiku
  return 'claude-3-haiku-20240307';
}
```

### Exemplos

**Usa Haiku (simples):**
```
"50 mercado" → complexity = 0.0 → Haiku
"Como estou?" → complexity = 0.1 → Haiku
"Quero criar orçamento" → complexity = 0.2 → Haiku
```

**Usa Sonnet (complexo):**
```
"Analise meus gastos de 2024 e compare com 2023,
 identificando tendências e projetando 2025"
→ complexity = 0.8 → Sonnet

"Explique a diferença entre CDI, Selic e IPCA,
 e qual é melhor pra investir agora?"
→ complexity = 0.6 → Sonnet
```

---

## 💾 GERENCIAMENTO DE ESTADO

### Por que Precisamos de Estado?

Conversas financeiras frequentemente exigem **múltiplos turnos**:

```
Turno 1: "Quero criar orçamento"
Turno 2: "Sim, pode ajudar"
Turno 3: "Pode criar"  ← precisa lembrar que estamos criando orçamento!
```

### Estrutura do Estado

```javascript
{
  pendingAction: 'CREATE_BUDGET',  // Ação aguardando confirmação
  context: {                        // Dados da ação
    suggestedBudgets: [...]
  },
  lastAgent: 'cfo',                 // Último agente que respondeu
  lastQuestion: '...',              // Última pergunta feita
  awaitingConfirmation: true,       // Aguarda "sim/não"
  turnCount: 3                      // Número de turnos
}
```

### Ações Pendentes

```javascript
const PENDING_ACTIONS = {
  CREATE_BUDGET: 'CREATE_BUDGET',
  CREATE_GOAL: 'CREATE_GOAL',
  CONFIRM_TRANSACTION: 'CONFIRM_TRANSACTION',
  ADJUST_GOAL: 'ADJUST_GOAL'
};
```

### Resolução de Respostas Curtas

```javascript
function resolveShortResponse(input, state) {
  if (!state?.pendingAction) return null;

  const affirmative = /^(sim|quero|ok|isso|pode|claro|bora|confirmo)/i;
  const negative = /^(não|nao|cancela|esquece)/i;

  if (affirmative.test(input)) {
    return {
      action: state.pendingAction,
      confirmed: true,
      data: state.context
    };
  }

  if (negative.test(input)) {
    return {
      action: state.pendingAction,
      confirmed: false
    };
  }

  return null;
}
```

### Fluxo com Estado

```
1. CFO: "Quer que eu crie orçamento?"
   ↓ salva estado
   {
     pendingAction: 'CREATE_BUDGET',
     awaitingConfirmation: true
   }

2. User: "sim"
   ↓ resolve estado
   {
     action: 'CREATE_BUDGET',
     confirmed: true
   }
   ↓ CFO cria orçamentos

3. CFO: "✅ Orçamentos criados!"
   ↓ limpa estado
   { pendingAction: null }
```

---

## 🔌 INTEGRAÇÃO CLAUDE API

### Configuração

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### Retry Logic com Exponential Backoff

```javascript
async function executeWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Erros retryable: 429 (rate limit), 5xx (server), network
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s (max 10s)
      const delay = Math.min(Math.pow(2, attempt) * 1000, 10000);
      await sleep(delay);
    }
  }
}
```

### Chamada Principal

```javascript
async function callClaude(systemPrompt, userMessage, model, history = []) {
  const messages = [
    // Histórico (últimas 10 mensagens)
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    // Mensagem atual
    { role: 'user', content: userMessage }
  ];

  return await executeWithRetry(async () => {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      temperature: 0.7
    });

    return response.content[0].text;
  });
}
```

### Chamada com Vision

```javascript
async function callClaudeVision(systemPrompt, imageBase64, mimeType) {
  return await executeWithRetry(async () => {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: 'Extraia os dados desta imagem.'
          }
        ]
      }]
    });

    return response.content[0].text;
  });
}
```

---

## 📋 EXEMPLOS PRÁTICOS

### Exemplo 1: Criar Objetivo de Viagem

**Conversa Completa:**

```
┌─────────────────────────────────────────────────────────────┐
│ Usuário:                                                    │
│ "Quero juntar 20 mil pra uma viagem pra Europa"            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    ORCHESTRATOR
    ✓ Detecta: PLANNER_PATTERNS (viagem + valor)
    ✓ Roteia para: 'planner'
         │
         ▼
    PLANNER (Haiku)
    ✓ Prompt: PLANNER_PROMPT + contexto financeiro
    ✓ Detecta: falta prazo
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Zeni (PLANNER):                                             │
│ "Legal! 🎯 Você tem algum prazo em mente para essa viagem?"│
└─────────────────────────────────────────────────────────────┘
         │
         ▼ salva estado: { pendingAction: 'CREATE_GOAL', context: {amount: 20000} }
         │
┌─────────────────────────────────────────────────────────────┐
│ Usuário:                                                    │
│ "Quero ir em dezembro do ano que vem"                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    ORCHESTRATOR
    ✓ Detecta: continuação de PLANNER
    ✓ Estado: pendingAction = CREATE_GOAL
    ✓ Roteia para: 'planner'
         │
         ▼
    PLANNER (Haiku)
    ✓ Agora tem: valor (20k), prazo (dez/2027)
    ✓ Calcula: 20 meses, R$1.000/mês
    ✓ Margem disponível: R$2.000/mês
    ✓ Viabilidade: 50% (médio)
    ✓ Retorna JSON:
    {
      "action": "create_goal",
      "goal": {
        "name": "Viagem Europa",
        "targetAmount": 20000,
        "deadline": "2027-12-01",
        "priority": "high",
        "category": "travel"
      },
      "message": "🎯 Objetivo criado! Guarde R$1.000/mês."
    }
         │
         ▼
    CHAT ROUTER
    ✓ Extrai JSON com extractJSON()
    ✓ Valida: name ✓, targetAmount ✓
    ✓ Insere no banco: goals table
    ✓ ID criado: 123
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Zeni:                                                       │
│ 🎯 Objetivo "Viagem Europa" criado com sucesso!            │
│ Meta: R$20.000,00 até dezembro de 2027.                    │
│ Você precisa guardar cerca de R$1.000/mês.                 │
└─────────────────────────────────────────────────────────────┘
```

**Banco de Dados:**
```sql
SELECT * FROM goals WHERE id = 123;
-- id: 123
-- name: "Viagem Europa"
-- target_amount: 20000.00
-- deadline: "2027-12-01"
-- category: "travel"
-- priority: "high"
```

---

### Exemplo 2: Criar Orçamento (Multi-Turno)

```
┌─────────────────────────────────────────────────────────────┐
│ Usuário: "Quero criar um orçamento"                        │
└─────────────────────────────────────────────────────────────┘
    ↓ [CFO_PATTERNS matched]
    ↓ Agente: 'cfo'
    ↓ Contexto: { totalBudget: 0, expenses: 15400 }
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Zeni (CFO):                                                 │
│ Você ainda não tem orçamento definido. Gastou R$15.400.    │
│                                                             │
│ Maiores gastos:                                             │
│ • Casa: R$10.000                                            │
│ • Mercado: R$2.100                                          │
│ • Restaurante: R$1.800                                      │
│                                                             │
│ Quer que eu te ajude a montar um orçamento?                │
└─────────────────────────────────────────────────────────────┘
    ↓ Estado salvo: { pendingAction: 'CREATE_BUDGET', awaitingConfirmation: true }
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Usuário: "sim, quero"                                      │
└─────────────────────────────────────────────────────────────┘
    ↓ [Resposta curta detectada]
    ↓ [Estado resolvido: confirmed = true]
    ↓ [Mantém agente: 'cfo']
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Zeni (CFO):                                                 │
│ Baseado nos seus gastos, sugiro:                           │
│                                                             │
│ 📊 Orçamento Sugerido:                                      │
│ • Casa: R$10.000                                            │
│ • Mercado: R$2.500                                          │
│ • Restaurante: R$1.500                                      │
│ • Carro: R$800                                              │
│                                                             │
│ Total: R$14.800/mês                                         │
│                                                             │
│ Quer que eu defina esses valores?                          │
└─────────────────────────────────────────────────────────────┘
    ↓ Estado: { pendingAction: 'CREATE_BUDGET', suggestedBudgets: [...] }
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Usuário: "pode criar"                                      │
└─────────────────────────────────────────────────────────────┘
    ↓ [Confirmação detectada]
    ↓ [CFO retorna JSON de ação]
    ↓
    CFO Response:
    {
      "action": "create_budgets",
      "budgets": [
        {"category": "Casa", "amount": 10000},
        {"category": "Mercado", "amount": 2500},
        {"category": "Restaurante", "amount": 1500},
        {"category": "Carro", "amount": 800}
      ],
      "confirmation": "✅ Orçamento criado!"
    }
    ↓
    CHAT ROUTER processa:
    ✓ extractJSON() extrai o objeto
    ✓ Loop pelos budgets
    ✓ Busca category_id de cada categoria
    ✓ INSERT INTO budgets (4 orçamentos)
    ✓ createdCount = 4
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Zeni:                                                       │
│ ✅ 4 orçamento(s) criado(s) com sucesso!                    │
└─────────────────────────────────────────────────────────────┘
```

**Banco de Dados:**
```sql
SELECT c.name, b.amount FROM budgets b
JOIN categories c ON b.category_id = c.id
WHERE b.user_id = 1 AND b.month = 2 AND b.year = 2026;

-- Casa         | 10000.00
-- Mercado      |  2500.00
-- Restaurante  |  1500.00
-- Carro        |   800.00
```

---

### Exemplo 3: Registro Simples de Transação

```
┌─────────────────────────────────────────────────────────────┐
│ Usuário: "50 mercado"                                      │
└─────────────────────────────────────────────────────────────┘
    ↓ [TRANSACTION_PATTERNS matched: /^\d+\s+\w+$/]
    ↓ Agente: 'registrar'
    ↓ Modelo: Haiku (sempre)
    ↓
    REGISTRADOR Chain-of-Thought:
    1. Valor: 50
    2. Tipo: expense (default)
    3. Categoria: Mercado (keyword match)
    4. Data: 2026-02-01 (hoje)
    5. Descrição: "Compras no mercado"
    6. Paid: true (não é futuro)
    ↓
    REGISTRADOR Response (JSON):
    {
      "success": true,
      "transaction": {
        "amount": 50.00,
        "type": "expense",
        "category": "Mercado",
        "description": "Compras no mercado",
        "date": "2026-02-01",
        "paid": true
      },
      "confirmation": "✅ R$50,00 em Mercado registrado (pago)."
    }
    ↓
    CHAT ROUTER processa:
    ✓ JSON.parse() sucesso
    ✓ parsed.success = true
    ✓ Busca category_id de "Mercado" → 2
    ✓ INSERT INTO transactions (...)
    ✓ Substitui response pela confirmação amigável
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Zeni:                                                       │
│ ✅ R$50,00 em Mercado registrado (pago).                    │
└─────────────────────────────────────────────────────────────┘
```

**Banco de Dados:**
```sql
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1;
-- amount: 50.00
-- type: 'expense'
-- category_id: 2 (Mercado)
-- description: 'Compras no mercado'
-- date: '2026-02-01'
-- paid: true
```

---

## 🎓 CONCLUSÃO

### Principais Aprendizados

1. **Especialização > Generalização**
   - 6 agentes especializados > 1 chatbot genérico
   - Cada agente é expert em seu domínio
   - Prompts otimizados para contexto específico

2. **Roteamento é Crítico**
   - Regex patterns bem definidos
   - Ordem de prioridade clara
   - Contexto de conversa preservado

3. **Custo vs Capacidade**
   - Haiku para 90% das tarefas
   - Sonnet apenas quando necessário
   - Economia de até 70% nos custos de API

4. **Estado Multi-Turno**
   - Conversas naturais exigem memória
   - Ações pendentes guiam o fluxo
   - Persistência em PostgreSQL

5. **Resiliência**
   - Retry logic automático
   - Exponential backoff
   - Graceful degradation

### Diferencial Competitivo

O Zeni não é apenas "um app financeiro com IA". É uma **orquestra de especialistas**:

- 📝 Registrador → Como um contador que anota tudo
- 📊 CFO → Como um diretor financeiro pessoal
- 🛡️ Guardião → Como um consultor imparcial
- 📚 Educador → Como um professor de finanças
- 🎯 Planejador → Como um coach de metas
- 📷 Vision → Como um assistente que digitaliza documentos

Cada um com:
- ✅ Personalidade definida
- ✅ Expertise específica
- ✅ Prompts de alta qualidade
- ✅ Modelo otimizado para a tarefa

---

## 📚 REFERÊNCIAS

**Arquivos-chave do código:**
- [orchestrator.js](backend/src/agents/orchestrator.js) - Roteamento e execução
- [prompts.js](backend/src/agents/prompts.js) - System prompts (7000+ linhas)
- [claude.js](backend/src/services/claude.js) - Integração Claude API
- [chat.js](backend/src/routes/chat.js) - Endpoint e persistência
- [conversationState.js](backend/src/services/conversationState.js) - Gerenciamento de estado

**Documentação adicional:**
- [AGENTES-IA.md](docs/AGENTES-IA.md) - Documentação original
- [PLANO-TECNICO.md](docs/PLANO-TECNICO.md) - Visão técnica geral
- [TESTE-CADASTRO-CHAT.md](TESTE-CADASTRO-CHAT.md) - Guia de testes

---

**Versão:** 2.0
**Data:** 30 de Janeiro de 2026
**Autor:** Sistema Zeni - Documentação Técnica
