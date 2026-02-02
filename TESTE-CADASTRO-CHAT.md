# 🧪 Guia de Testes - Cadastro via Chat

Este documento contém todos os cenários de teste para validar que o sistema está cadastrando corretamente objetivos, orçamentos e outras entidades via chat.

---

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **Contexto de Goals para o Planner**
- ✅ Adicionado busca de goals na função `getUserContext()`
- ✅ Dados incluídos: goals, monthlyIncome, availableMargin, existingCommitments
- ✅ Agente PLANNER agora recebe dados completos para análise de viabilidade

### 2. **Parsing JSON Robusto**
- ✅ Função `extractJSON()` criada com múltiplas estratégias:
  - Parse direto
  - Remoção de markdown code blocks
  - Extração por regex de ações específicas
  - Busca genérica de objetos JSON
- ✅ Aplicada tanto no CFO quanto no PLANNER

### 3. **Feedback Explícito de Erros**
- ✅ Erros agora são mostrados ao usuário com mensagens claras
- ✅ Logs detalhados com `logger.info` e `logger.error`
- ✅ Validação de dados antes de inserir no banco

### 4. **Prompts Melhorados**
- ✅ PLANNER: Instruções explícitas sobre quando retornar JSON
- ✅ CFO: Formato obrigatório documentado com exemplos
- ✅ Lista de categorias disponíveis adicionada

---

## 🎯 CENÁRIOS DE TESTE - OBJETIVOS (PLANNER)

### Teste 1: Criar objetivo com dados completos
```
Mensagem: "Quero juntar 15000 pra uma viagem pra Europa até dezembro"

Resultado esperado:
✅ Objetivo criado no banco de dados
✅ Mensagem de confirmação com valor formatado
✅ Dados salvos:
   - name: "Viagem Europa" (ou similar)
   - target_amount: 15000
   - deadline: "2026-12-01"
   - category: "travel"
   - priority: "high" ou "medium"
```

**Como verificar:**
```sql
SELECT * FROM goals WHERE user_id = [SEU_USER_ID] ORDER BY created_at DESC LIMIT 1;
```

---

### Teste 2: Criar objetivo sem prazo
```
Mensagem: "Quero juntar 5000 pra comprar um notebook"

Resultado esperado:
✅ IA pergunta se há prazo OU cria com deadline = null
✅ Se criado: objetivo salvo com category = "purchase"
```

---

### Teste 3: Criar objetivo em múltiplas mensagens
```
Mensagem 1: "Quero juntar dinheiro pra uma viagem"
Resposta IA: "Legal! Pra onde? E quanto você precisa?"

Mensagem 2: "Europa, preciso de uns 20 mil"
Resposta IA: "Você tem algum prazo em mente?"

Mensagem 3: "Quero ir em dezembro do ano que vem"
Resultado esperado: ✅ Objetivo criado com todos os dados
```

---

### Teste 4: Consultar objetivos existentes
```
Mensagem: "Como está minha meta de viagem?"

Resultado esperado:
✅ Mostra progresso atual (R$X de R$Y)
✅ Percentual de conclusão
✅ Prazo restante
✅ Contribuição mensal necessária
```

---

### Teste 5: Criar objetivo com valor inválido
```
Mensagem: "Quero juntar pra uma viagem"

Resultado esperado:
✅ IA pede o valor: "Quanto você precisa juntar?"
❌ NÃO deve criar objetivo sem valor
```

---

## 📊 CENÁRIOS DE TESTE - ORÇAMENTOS (CFO)

### Teste 6: Criar orçamento completo
```
Mensagem 1: "Quero criar um orçamento"
Resposta IA: "Análise dos gastos + sugestão de orçamento"

Mensagem 2: "Sim, pode criar"
Resultado esperado:
✅ Múltiplos budgets criados no banco
✅ Confirmação: "X orçamentos criados com sucesso!"
```

**Como verificar:**
```sql
SELECT c.name, b.amount, b.month, b.year
FROM budgets b
JOIN categories c ON b.category_id = c.id
WHERE b.user_id = [SEU_USER_ID]
  AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND b.year = EXTRACT(YEAR FROM CURRENT_DATE);
```

---

### Teste 7: Criar orçamento específico
```
Mensagem: "Quero definir 2000 por mês pro mercado"

Resultado esperado:
✅ Budget criado para categoria "Mercado"
✅ amount = 2000
✅ month/year = mês/ano atual
```

---

### Teste 8: Atualizar orçamento existente
```
Pré-condição: Já existe budget para "Mercado" = 1500

Mensagem: "Quero aumentar o orçamento do mercado pra 2500"

Resultado esperado:
✅ Budget atualizado (ON CONFLICT DO UPDATE)
✅ Novo valor: 2500
```

---

### Teste 9: Orçamento com categoria inexistente
```
Mensagem: "Defina 1000 pra categoria XYZ"

Resultado esperado:
⚠️ Erro logado: "Categoria não encontrada: XYZ"
⚠️ Mensagem ao usuário sobre categorias disponíveis
```

---

## 📝 CENÁRIOS DE TESTE - TRANSAÇÕES (REGISTRADOR)

### Teste 10: Registrar transação simples
```
Mensagem: "50 mercado"

Resultado esperado:
✅ Transação criada
✅ amount: 50.00
✅ type: "expense"
✅ category_id: (id da categoria Mercado)
✅ paid: true
```

---

### Teste 11: Registrar transação futura
```
Mensagem: "Vou pagar 500 de aluguel dia 10"

Resultado esperado:
✅ Transação criada
✅ paid: false (pendente)
✅ date: dia 10 do mês atual
```

---

### Teste 12: Registrar receita
```
Mensagem: "Recebi 5000 de salário"

Resultado esperado:
✅ type: "income"
✅ category_id: (id da categoria Salário)
```

---

### Teste 13: Múltiplas transações
```
Mensagem: "Gastei 50 no mercado e 30 no uber"

Resultado esperado:
✅ Primeira transação criada (50 mercado)
✅ IA pergunta se quer registrar a segunda (30 uber)
```

---

## 🔍 COMO EXECUTAR OS TESTES

### 1. Preparação
```bash
cd /Users/yourapple/SISTEMAFINANCEIRO/zeni/backend
npm run dev
```

### 2. Abrir Frontend
```bash
cd /Users/yourapple/SISTEMAFINANCEIRO/zeni/frontend
npm run dev
```

### 3. Login no Sistema
- Fazer login com seu usuário
- Ir para a página de Chat

### 4. Executar Cada Teste
- Enviar a mensagem conforme o cenário
- Verificar resposta da IA
- Verificar banco de dados com SQL
- Anotar resultados

### 5. Consultar Logs
```bash
# Acompanhar logs do backend em tempo real
tail -f /Users/yourapple/SISTEMAFINANCEIRO/zeni/backend/logs/*.log

# Ou ver logs no console onde rodou npm run dev
```

---

## 🐛 PROBLEMAS CONHECIDOS E COMO DEBUGAR

### Problema: "Objetivo não foi criado"
**Debug:**
1. Verificar logs do backend: buscar por `[Chat] Planner`
2. Verificar se JSON foi parseado: buscar por `extractJSON`
3. Verificar se há erro: buscar por `Erro ao processar create_goal`

**Possíveis causas:**
- IA não retornou JSON (prompt não foi seguido)
- JSON malformado
- Dados obrigatórios faltando (name, targetAmount)

**Solução:**
- Tentar reformular a pergunta de forma mais clara
- Exemplo: "Crie um objetivo de 15000 para viagem Europa até dezembro"

---

### Problema: "Orçamento não foi criado"
**Debug:**
1. Verificar logs: buscar por `[Chat] CFO`
2. Verificar se action é `create_budgets`
3. Verificar se categorias existem no banco

**Possíveis causas:**
- Categoria com nome errado (ex: "Compras" em vez de "Mercado")
- JSON não retornado pela IA
- Erro no array de budgets

**Solução:**
- Verificar categorias disponíveis:
```sql
SELECT name FROM categories ORDER BY name;
```
- Usar nomes exatos das categorias

---

### Problema: "IA repetindo informações"
**Causa:** Prompt do CFO tem regra "NUNCA repita", mas pode falhar

**Solução:**
- Dizer explicitamente: "Pode criar agora"
- Ser mais direto: "Sim, confirmo"

---

## 📋 CHECKLIST DE VALIDAÇÃO COMPLETA

Use este checklist para confirmar que tudo está funcionando:

- [ ] **Teste 1**: Objetivo com dados completos → Criado ✅
- [ ] **Teste 2**: Objetivo sem prazo → Pergunta OU cria com null ✅
- [ ] **Teste 3**: Objetivo em múltiplas mensagens → Criado após coleta ✅
- [ ] **Teste 4**: Consultar objetivo → Mostra dados corretos ✅
- [ ] **Teste 5**: Objetivo sem valor → Pede valor ✅
- [ ] **Teste 6**: Orçamento completo → Múltiplos budgets criados ✅
- [ ] **Teste 7**: Orçamento específico → Budget único criado ✅
- [ ] **Teste 8**: Atualizar orçamento → Budget atualizado ✅
- [ ] **Teste 9**: Categoria inexistente → Erro tratado ✅
- [ ] **Teste 10**: Transação simples → Criada ✅
- [ ] **Teste 11**: Transação futura → paid=false ✅
- [ ] **Teste 12**: Receita → type=income ✅
- [ ] **Teste 13**: Múltiplas transações → Trata corretamente ✅

---

## 💡 DICAS PARA TESTAR

1. **Seja específico**: "Criar objetivo de 15000 para viagem" é melhor que "quero viajar"
2. **Confirme claramente**: Use "sim", "pode criar", "confirmo"
3. **Verifique sempre o banco**: Não confie só na mensagem da IA
4. **Acompanhe os logs**: Eles mostram exatamente o que está acontecendo
5. **Teste casos extremos**: Valores muito altos, datas inválidas, categorias erradas

---

## 🎓 EXEMPLOS DE CONVERSAS COMPLETAS

### Exemplo 1: Criar Objetivo de Viagem
```
Você: "Quero juntar 20 mil pra uma viagem pra Europa"

Zeni: "Legal! 🎯 Você tem algum prazo em mente para essa viagem?"

Você: "Quero ir em dezembro do ano que vem"

Zeni:
{
  "action": "create_goal",
  "goal": {
    "name": "Viagem Europa",
    "targetAmount": 20000,
    "deadline": "2027-12-01",
    "priority": "high",
    "category": "travel"
  },
  "message": "🎯 Objetivo 'Viagem Europa' criado! Meta de R$20.000 até dezembro de 2027. Você precisa guardar cerca de R$909/mês."
}

✅ Mensagem exibida ao usuário:
"🎯 Objetivo 'Viagem Europa' criado! Meta de R$20.000,00 até dezembro de 2027. Você precisa guardar cerca de R$909/mês."
```

---

### Exemplo 2: Criar Orçamento
```
Você: "Quero criar um orçamento"

Zeni: "Você ainda não tem orçamento definido. Gastou R$15.400 este mês.

Maiores gastos:
• Casa: R$10.000
• Mercado: R$2.100
• Restaurante: R$1.800

Quer que eu te ajude a montar um orçamento baseado nesses gastos?"

Você: "Sim, quero"

Zeni: "Baseado nos seus gastos, sugiro esses limites mensais:

📊 **Orçamento Sugerido:**
• Casa: R$10.000
• Mercado: R$2.500
• Restaurante: R$1.500
• Carro: R$800

**Total sugerido: R$14.800/mês**

Quer que eu defina esses valores?"

Você: "Pode criar"

Zeni:
{
  "action": "create_budgets",
  "budgets": [
    {"category": "Casa", "amount": 10000},
    {"category": "Mercado", "amount": 2500},
    {"category": "Restaurante", "amount": 1500},
    {"category": "Carro", "amount": 800}
  ],
  "confirmation": "✅ Orçamento criado! Agora você pode acompanhar seus gastos vs limites."
}

✅ Mensagem exibida ao usuário:
"✅ 4 orçamento(s) criado(s) com sucesso!"
```

---

## 🚀 PRÓXIMOS PASSOS

Após validar todos os testes:

1. ✅ Confirmar que logs estão claros e informativos
2. ✅ Testar em produção (Railway)
3. ✅ Monitorar erros via Sentry ou similar
4. ✅ Adicionar testes automatizados (Jest)
5. ✅ Documentar API responses no Swagger

---

**Data da última atualização:** 2026-01-30
**Versão:** 1.0
**Autor:** Claude Code + Equipe Zeni
