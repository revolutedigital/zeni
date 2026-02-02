# 🚀 Novos Agentes de IA - Propostas

## 📊 ANÁLISE DE GAPS

### Agentes Atuais (6)
✅ Registrador - Cadastro de transações
✅ Registrador Visual - OCR de comprovantes
✅ CFO - Análises e orçamentos
✅ Guardião - Validação de gastos
✅ Educador - Educação financeira
✅ Planejador - Objetivos e metas

### Funcionalidades Não Cobertas
❌ Detecção de padrões e anomalias
❌ Otimização de gastos recorrentes
❌ Recomendações de investimentos
❌ Planejamento tributário
❌ Projeções e forecasting
❌ Gestão de dívidas
❌ Cashflow detalhado
❌ Negociação de contas

---

## 🎯 TOP 8 AGENTES PROPOSTOS

### 1. 🔍 DETETIVE (Detective) - **ALTA PRIORIDADE**

**Especialidade:** Detecção de padrões, anomalias e insights automatizados

**Por que é importante:**
- Usuários não percebem padrões em seus gastos
- Assinaturas esquecidas custam muito
- Anomalias podem indicar fraude

**O que faz:**

1. **Detecção de Padrões**
   ```
   "Você gasta 32% mais em restaurante nas quintas-feiras.
   Isso representa R$800/mês. Preparar jantar em casa
   nessas noites economizaria R$600."
   ```

2. **Anomalias**
   ```
   "🔴 Alerta: Você gastou R$1.200 em Mercado ontem.
   Sua média é R$300. Isso foi intencional?"
   ```

3. **Assinaturas Esquecidas**
   ```
   "Você tem 3 assinaturas de streaming há 6 meses
   (Netflix, Prime, HBO = R$120/mês).
   Usa todas? Cancelar 2 economizaria R$960/ano."
   ```

4. **Sazonalidade**
   ```
   "Dezembro é sempre seu mês mais caro (+45% vs média).
   Baseado nos últimos 3 anos, sugiro reservar
   R$2.500 extra para as festas."
   ```

**Quando é acionado:**
- Análise automática semanal/mensal
- "Encontre padrões nos meus gastos"
- "Tenho alguma assinatura esquecida?"
- "Onde posso economizar?"

**Modelo:** Sonnet (precisa de raciocínio complexo)

**Contexto necessário:**
```javascript
{
  transactions: [], // Últimos 12 meses
  recurringCharges: [], // Gastos que se repetem
  averages: { byCategory, byDay, byMonth },
  anomalyThreshold: 2.0 // Desvio padrão
}
```

**Benefício:** **Economia passiva** - usuário economiza sem esforço ativo

---

### 2. 💰 NEGOCIADOR (Negotiator) - **ALTA PRIORIDADE**

**Especialidade:** Redução de custos fixos e negociação de contas

**Por que é importante:**
- Contas fixas (internet, telefone, planos) sobem todo ano
- Brasileiro não negocia por vergonha/desconhecimento
- Potencial de economia: R$200-500/mês

**O que faz:**

1. **Identificação de Oportunidades**
   ```
   "Seu plano de internet custa R$150/mês.
   Achei 3 opções mais baratas:
   • Vivo Fibra 300mb: R$99
   • Claro 200mb: R$89
   • TIM 500mb: R$120

   Quer que eu prepare um script de negociação
   para ligar na sua operadora atual?"
   ```

2. **Scripts de Negociação**
   ```
   📞 Script para ligar na TIM:

   1. "Olá, estou pensando em cancelar porque
      encontrei planos mais baratos."

   2. Se oferecerem desconto: "Isso ainda fica
      mais caro que a concorrência (R$89)."

   3. Meta: Conseguir pelo menos R$120 ou menos.
   ```

3. **Rastreamento de Validade**
   ```
   "Seu desconto na academia vence em 15 dias.
   Lembre de renegociar antes!"
   ```

4. **Análise de Contratos**
   ```
   "Você paga R$200/mês de seguro do carro.
   Baseado no seu perfil, o valor justo seria
   R$150. Quer cotações de outras seguradoras?"
   ```

**Quando é acionado:**
- "Como reduzir minhas contas fixas?"
- "Ache planos mais baratos"
- "Prepare negociação com [empresa]"
- Automático: detecta gastos acima da média

**Modelo:** Haiku (scripts estruturados)

**Integração Futura:**
- API de comparação de preços
- Parceria com corretoras
- Cashback por conversão

**Benefício:** **R$2.400-6.000/ano** de economia potencial

---

### 3. 📈 INVESTIDOR (Investor) - **MÉDIA PRIORIDADE**

**Especialidade:** Recomendações de investimentos personalizadas

**Por que é importante:**
- Brasileiro deixa dinheiro parado na poupança
- Falta conhecimento sobre onde investir
- Mercado financeiro intimida

**O que faz:**

1. **Análise de Perfil**
   ```
   Baseado nas suas respostas:
   • Reserva de emergência: Não tem ainda
   • Prazo: Médio (3-5 anos)
   • Tolerância a risco: Moderada

   Recomendo essa ordem:
   1️⃣ Reserva (6 meses): Tesouro Selic
   2️⃣ Sobra: 70% Tesouro IPCA + 30% Ações
   ```

2. **Sugestões Concretas**
   ```
   Você tem R$1.500 de sobra este mês.

   Sugestão:
   • R$1.000 → Tesouro Selic (liquidez)
   • R$300 → IVVB11 (ações EUA)
   • R$200 → MXRF11 (FII)

   Rentabilidade esperada: 12-14% a.a.
   ```

3. **Educação Contextual**
   ```
   "Tesouro Selic rende 100% do CDI (hoje 11,65% a.a.).
   É como uma poupança turbinada, mas você
   pode resgatar a qualquer momento."
   ```

4. **Rebalanceamento**
   ```
   "Suas ações subiram muito e agora representam
   40% da carteira (meta era 30%).

   Sugiro vender R$2.000 em ações e realocar
   em renda fixa para manter o equilíbrio."
   ```

**Quando é acionado:**
- "Onde investir meu dinheiro?"
- "Tenho R$X sobrando, o que faço?"
- Automático: quando margem > R$500 por 3 meses

**Modelo:** Sonnet (análise complexa)

**Compliance:**
- ⚠️ **NÃO é consultoria de investimentos**
- Apenas educação e direcionamento
- Avisar para consultar profissional certificado

**Integração Futura:**
- API de corretoras (B3, XP, Rico)
- Sincronização automática de carteira

---

### 4. 🧮 TRIBUTARISTA (Tax Advisor) - **MÉDIA PRIORIDADE**

**Especialidade:** Planejamento tributário e IR

**Por que é importante:**
- Brasileiro paga muito imposto sem saber
- IR intimida, muitos erram
- Deduções deixadas na mesa

**O que faz:**

1. **Simulação de IR**
   ```
   Baseado nos seus rendimentos de 2025:

   Declaração Simplificada:
   • Imposto devido: R$8.500

   Declaração Completa (com deduções):
   • Saúde: R$12.000
   • Educação: R$3.500
   • Imposto devido: R$5.200

   💡 Economia: R$3.300 usando completa!
   ```

2. **Lembrete de Deduções**
   ```
   "Você gastou R$450 com dentista em janeiro.
   Isso é dedutível no IR. Guardei o comprovante!"
   ```

3. **Planejamento**
   ```
   "Faltam 2 meses para fechar o ano fiscal.
   Você pode deduzir mais R$1.500 em educação.

   Fazer aquele curso que você queria economizaria
   R$400 de imposto (27% de R$1.500)."
   ```

4. **Cryptos e Investimentos**
   ```
   "Você vendeu ações com lucro de R$35.000.
   Imposto devido: R$5.250 (15%).

   Lembre de pagar até o último dia útil de fevereiro!"
   ```

**Quando é acionado:**
- "Como declarar meu IR?"
- "Quanto vou pagar de imposto?"
- Automático: Jan-Abr (período de IR)

**Modelo:** Sonnet (cálculos complexos)

**Compliance:**
- ⚠️ **NÃO substitui contador**
- Orientações gerais, não específicas
- Recomendar profissional para casos complexos

---

### 5. 🔮 FORECASTER (Projetor) - **BAIXA PRIORIDADE**

**Especialidade:** Projeções financeiras baseadas em histórico

**O que faz:**

1. **Projeção de Gastos**
   ```
   Baseado nos últimos 12 meses:

   Previsão para Março/2026:
   • Mercado: R$1.200 (±10%)
   • Restaurante: R$800 (±15%)
   • Casa: R$3.500 (fixo)

   Total estimado: R$18.500
   ```

2. **Cenários**
   ```
   Se você reduzir restaurante em 30%:
   • Economia mensal: R$240
   • Economia anual: R$2.880
   • Em 5 anos: R$14.400
   ```

3. **Alertas Antecipados**
   ```
   "Com base no seu padrão, você vai estourar
   o orçamento de Vestuário em 10 dias.
   Sobram R$300 para os próximos 25 dias."
   ```

**Modelo:** Sonnet (ML-like reasoning)

---

### 6. 💳 DEBT DESTROYER (Destruidor de Dívidas) - **ALTA PRIORIDADE**

**Especialidade:** Estratégias de quitação de dívidas

**Por que é importante:**
- 77% dos brasileiros estão endividados
- Juros do cartão são abusivos (400%+ a.a.)
- Falta de estratégia piora o buraco

**O que faz:**

1. **Diagnóstico Completo**
   ```
   Suas dívidas:

   🔴 Cartão de Crédito: R$8.500 (15,5% a.m.)
      Urgência: CRÍTICA

   🟡 Empréstimo Pessoal: R$12.000 (3,2% a.m.)
      Urgência: Alta

   🟢 Financiamento Carro: R$28.000 (1,8% a.m.)
      Urgência: Baixa

   Custo total de juros: R$3.420/mês 💸
   ```

2. **Estratégia Snowball vs Avalanche**
   ```
   MÉTODO SNOWBALL (motivação):
   1. Pagar cartão (menor saldo, maior juros)
   2. Depois empréstimo
   3. Depois financiamento
   Tempo: 18 meses | Juros: R$15.200

   MÉTODO AVALANCHE (matemático):
   1. Focar todo extra no cartão (maior juros)
   2. Mínimos nos outros
   Tempo: 16 meses | Juros: R$12.800

   💡 Economia Avalanche: R$2.400
   ```

3. **Negociação de Dívida**
   ```
   Sua dívida do cartão tá 90+ dias atrasada.
   O banco aceita desconto.

   Script de negociação:
   "Consigo pagar R$5.000 à vista hoje.
   Vocês aceitam quitar a dívida de R$8.500?"

   Meta: 40-60% de desconto
   ```

4. **Plano Personalizado**
   ```
   Com sua margem de R$1.200/mês:

   Mês 1-4: R$1.000 → Cartão | R$200 → Reserva
   Mês 5-12: R$800 → Empréstimo | R$400 → Reserva
   Mês 13+: Livre de dívidas! 🎉
   ```

**Quando é acionado:**
- "Como quitar minhas dívidas?"
- "Estou endividado, me ajuda"
- Automático: detecta despesas com juros

**Modelo:** Haiku (cálculos estruturados)

**Diferencial:** Sem julgamento, foco em ação

---

### 7. 💸 CASHFLOW MASTER (Mestre do Fluxo) - **BAIXA PRIORIDADE**

**Especialidade:** Gestão de fluxo de caixa

**O que faz:**

1. **Calendário de Pagamentos**
   ```
   Próximos 30 dias:

   05/02: Aluguel (R$2.500) 🏠
   10/02: Fatura cartão (R$1.800) 💳
   15/02: Salário (+R$8.000) 💰
   20/02: Academia (R$150) 🏋️
   25/02: Internet (R$120) 📡

   Menor saldo: R$800 (dia 14)
   Maior saldo: R$6.200 (dia 16)
   ```

2. **Alertas de Caixa**
   ```
   ⚠️ Atenção: Entre 10-15/02 você terá
   apenas R$800 em caixa.

   Sugestão: Antecipar pagamento do aluguel
   para o dia 16 (após receber salário).
   ```

**Modelo:** Haiku

---

### 8. 🎮 COACH (Motivador) - **BAIXA PRIORIDADE**

**Especialidade:** Gamificação e motivação

**O que faz:**

1. **Challenges**
   ```
   🎯 Challenge da Semana:
   "Semana sem Delivery"

   Economia potencial: R$280
   Recompensa: Badge "Cozinheiro" 👨‍🍳
   ```

2. **Conquistas**
   ```
   🏆 NOVA CONQUISTA DESBLOQUEADA!
   "Primeiro Mês Sem Estourar Orçamento"

   Você entrou no top 20% dos usuários Zeni!
   ```

3. **Streaks**
   ```
   🔥 7 DIAS CONSECUTIVOS REGISTRANDO GASTOS!

   Continue assim para desbloquear o badge
   "Disciplina de Aço"
   ```

**Modelo:** Haiku

**Risco:** Pode parecer infantil se mal executado

---

## 📊 PRIORIZAÇÃO RECOMENDADA

### Fase 1 (Próximos 3 meses) - **MVP Enhancements**

1. **🔍 DETETIVE** - Impacto ALTÍSSIMO
   - Economia passiva
   - Funciona sem ação do usuário
   - Diferencial competitivo forte
   - **Esforço:** Médio (Sonnet + queries SQL complexas)

2. **💰 NEGOCIADOR** - Impacto ALTO
   - ROI direto e mensurável
   - Scripts podem ser templates
   - Viralização boca-a-boca
   - **Esforço:** Baixo (templates + Haiku)

3. **💳 DEBT DESTROYER** - Impacto ALTO (público específico)
   - 77% dos brasileiros endividados
   - Problema urgente e doloroso
   - Fidelização forte
   - **Esforço:** Médio (cálculos + estratégias)

### Fase 2 (6 meses) - **Advanced Features**

4. **📈 INVESTIDOR** - Impacto MÉDIO-ALTO
   - Monetização futura (afiliação)
   - Diferenciação vs bancos
   - **Esforço:** Alto (compliance + integrações)

5. **🧮 TRIBUTARISTA** - Impacto SAZONAL
   - Útil 4 meses/ano (Jan-Abr)
   - Complexidade alta
   - **Esforço:** Alto (legislação + validações)

### Fase 3 (12+ meses) - **Nice to Have**

6. **🔮 FORECASTER** - Impacto BAIXO
7. **💸 CASHFLOW MASTER** - Impacto BAIXO
8. **🎮 COACH** - Impacto BAIXO

---

## 🛠️ IMPLEMENTAÇÃO TÉCNICA

### Estrutura do Novo Agente (Exemplo: DETETIVE)

```javascript
// 1. Adicionar prompt
// backend/src/agents/prompts.js
export const DETECTIVE_PROMPT = `Você é o Detetive do Zeni...`;

// 2. Adicionar padrões de roteamento
// backend/src/agents/orchestrator.js
const DETECTIVE_PATTERNS = [
  /\bencontre padr[oõ]es\b/i,
  /\bonde posso economizar\b/i,
  /\bassinatura esquecida\b/i,
  /\bgastos an[oô]malos\b/i,
];

// 3. Adicionar ao roteador
if (hasDetectiveIntent(input)) {
  return 'detective';
}

// 4. Adicionar contexto específico
// backend/src/routes/chat.js
const detectiveContext = {
  transactions: last12MonthsTransactions,
  recurringCharges: identifyRecurring(transactions),
  averages: calculateAverages(transactions),
  anomalies: detectAnomalies(transactions)
};

// 5. Processar análises periódicas
// backend/src/jobs/weeklyAnalysis.js
async function runWeeklyDetective(userId) {
  const insights = await callClaude(DETECTIVE_PROMPT, ...);
  // Enviar notificação push
  await sendPushNotification(userId, insights);
}
```

### Esforço Estimado por Agente

| Agente | Desenvolvimento | Testes | Total | Complexidade |
|--------|-----------------|--------|-------|--------------|
| **Detetive** | 3 dias | 1 dia | 4 dias | Média |
| **Negociador** | 2 dias | 1 dia | 3 dias | Baixa |
| **Debt Destroyer** | 3 dias | 1 dia | 4 dias | Média |
| **Investidor** | 5 dias | 2 dias | 7 dias | Alta |
| **Tributarista** | 7 dias | 3 dias | 10 dias | Alta |

---

## 💰 ANÁLISE DE ROI

### DETETIVE
**Custo de Desenvolvimento:** 4 dias
**Economia Média por Usuário:** R$200-500/mês
**Valor Percebido:** ALTÍSSIMO
**Churn Reduction:** 30-40%

### NEGOCIADOR
**Custo de Desenvolvimento:** 3 dias
**Economia Média por Usuário:** R$150-300/mês
**Viralização:** ALTA (pessoas compartilham economia)
**Conversão:** 15-20% dos usuários tomam ação

### DEBT DESTROYER
**Custo de Desenvolvimento:** 4 dias
**Público-Alvo:** 77% dos brasileiros
**Retenção:** ALTÍSSIMA (problema urgente)
**Monetização Futura:** Parceria com bancos para refinanciamento

---

## 🎯 RECOMENDAÇÃO FINAL

**Implementar AGORA:**
1. 🔍 **DETETIVE** - Maior impacto vs esforço
2. 💰 **NEGOCIADOR** - Viralização orgânica

**Implementar em Q2/2026:**
3. 💳 **DEBT DESTROYER** - Público gigante no Brasil

**Avaliar para Q3/2026:**
4. 📈 **INVESTIDOR** - Monetização + diferenciação

**Não priorizar:**
- Forecaster, Cashflow Master, Coach (baixo ROI)

---

## 📝 PRÓXIMOS PASSOS

1. **Validar com Usuários**
   - Survey: "Qual desses recursos seria mais útil?"
   - Entrevistas: 5-10 usuários beta

2. **MVP do DETETIVE**
   - Implementar apenas "Assinaturas Esquecidas"
   - Testar com 100 usuários
   - Medir economia gerada

3. **Métricas de Sucesso**
   - % de usuários que tomam ação
   - Economia média gerada
   - NPS após usar o agente
   - Compartilhamento social

---

**Documentado por:** Claude Code - Análise Enterprise
**Data:** 30 de Janeiro de 2026
**Versão:** 1.0
