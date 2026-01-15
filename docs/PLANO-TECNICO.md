# ZENI - Plano Técnico

## Visão Geral

**Zeni** é um sistema de finanças pessoais com IA conversacional que elimina a fricção do controle financeiro.

### Princípios

1. **Simplicidade** - Interface limpa, sem firulas
2. **IA de verdade** - Agentes que entendem contexto e ajudam
3. **Zero fricção** - Cadastro por texto, foto ou voz
4. **Seus dados** - Importação da planilha existente

---

## Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| **Banco de Dados** | PostgreSQL (Railway) |
| **Backend** | Node.js + Express (ou Python FastAPI) |
| **Frontend** | React + Vite (PWA) |
| **IA** | Claude API (Sonnet + Haiku) |
| **OCR** | Claude Vision (fotos de comprovantes) |
| **Hospedagem** | Railway |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND PWA                       │
│                  (React + Vite + PWA)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │Dashboard │  │  Chat    │  │ Registro Rápido      │  │
│  │          │  │  IA      │  │ (texto/foto)         │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────┐
│                      BACKEND API                        │
│                   (Node.js/Express)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   ROTAS                          │  │
│  │  /transactions  /chat  /insights  /budget       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │              ORQUESTRADOR DE AGENTES             │  │
│  │  Decide qual agente acionar baseado no contexto  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │
│  │ AGENTE  │ │ AGENTE  │ │ AGENTE  │ │   AGENTE    │  │
│  │   CFO   │ │GUARDIÃO │ │EDUCADOR │ │ REGISTRADOR │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    POSTGRESQL                           │
│  users | transactions | categories | budgets | chat    │
└─────────────────────────────────────────────────────────┘
```

---

## Funcionalidades MVP

### 1. Registro de Transações

**Entrada por texto livre:**
```
"50 mercado" → R$50,00 | Categoria: Mercado | Hoje
"uber 25 ontem" → R$25,00 | Categoria: Transporte | Ontem
"paguei 1500 de aluguel dia 5" → R$1.500,00 | Categoria: Moradia | Dia 5
```

**Entrada por foto:**
- Upload de cupom fiscal / comprovante Pix
- Claude Vision extrai: valor, estabelecimento, data
- Categorização automática

### 2. Dashboard

- **Saldo do mês**: quanto entrou vs quanto saiu
- **Por categoria**: gráfico simples de barras
- **Orçamento vs Real**: comparativo com metas
- **Últimas transações**: lista das 10 mais recentes

### 3. Chat com IA

Interface conversacional para:
- Perguntar sobre gastos ("quanto gastei em mercado esse mês?")
- Pedir análises ("como estou comparado ao mês passado?")
- Receber insights proativos
- Tirar dúvidas financeiras

### 4. Orçamento

- Definir limite mensal por categoria
- Alertas quando se aproximar do limite
- Baseado nos seus orçamentos atuais da planilha

---

## Agentes de IA

### Agente CFO (Claude Sonnet)
- Visão estratégica das finanças
- Análises de longo prazo
- Planejamento e metas
- "Reunião semanal" com resumo

### Agente Guardião (Claude Sonnet)
- Alerta de gastos fora do padrão
- Questiona decisões impulsivas
- Monitora orçamentos

### Agente Educador (Claude Haiku)
- Explica conceitos financeiros
- Dicas contextuais
- Responde dúvidas simples

### Agente Registrador (Claude Haiku)
- Interpreta texto livre → transação
- OCR de fotos
- Categorização automática
- Rápido e barato

---

## Roadmap MVP

### Sprint 1: Fundação
- [ ] Setup projeto (Node.js + React + PostgreSQL)
- [ ] Modelagem do banco
- [ ] CRUD básico de transações
- [ ] Importação da planilha Excel

### Sprint 2: Interface Base
- [ ] Tela de Dashboard
- [ ] Tela de listagem de transações
- [ ] Formulário de cadastro manual
- [ ] Autenticação simples

### Sprint 3: IA - Registro
- [ ] Agente Registrador (texto → transação)
- [ ] Integração Claude Vision (foto → transação)
- [ ] Categorização automática

### Sprint 4: IA - Conversacional
- [ ] Interface de chat
- [ ] Agente CFO
- [ ] Agente Guardião
- [ ] Agente Educador

### Sprint 5: Refinamento
- [ ] Orçamentos e alertas
- [ ] PWA (instalável)
- [ ] Ajustes de UX
- [ ] Testes com dados reais

---

## Estrutura de Pastas

```
zeni/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── transactions.js
│   │   │   ├── chat.js
│   │   │   ├── budget.js
│   │   │   └── insights.js
│   │   ├── agents/
│   │   │   ├── orchestrator.js
│   │   │   ├── cfo.js
│   │   │   ├── guardian.js
│   │   │   ├── educator.js
│   │   │   └── registrar.js
│   │   ├── services/
│   │   │   ├── claude.js
│   │   │   └── ocr.js
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── seed.js
│   │   └── index.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── Chat.jsx
│   │   ├── components/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── PLANO-TECNICO.md
│   ├── DATABASE-SCHEMA.md
│   └── AGENTES-IA.md
└── CHANGELOG.md
```

---

## Considerações de Segurança

- Dados financeiros são sensíveis
- HTTPS obrigatório
- Autenticação por sessão/JWT
- Variáveis de ambiente para API keys
- Sanitização de inputs
- Rate limiting nas rotas de IA

---

## Custos Estimados

| Item | Custo/mês |
|------|-----------|
| Railway (DB + Backend) | ~$5-20 |
| Claude API (uso pessoal) | ~$10-30 |
| Domínio (opcional) | ~$1 |
| **Total** | **~$15-50/mês** |

---

## Próximos Passos

1. Aprovar este plano
2. Criar schema do banco (DATABASE-SCHEMA.md)
3. Definir prompts dos agentes (AGENTES-IA.md)
4. Iniciar Sprint 1
