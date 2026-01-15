# Zeni

Sistema de finanças pessoais com IA.

## Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + Tailwind (PWA)
- **IA**: Claude API (Haiku + Sonnet)

## Setup Rápido

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais
```

### 2. Banco de Dados

```bash
npm run db:migrate   # Cria as tabelas
npm run db:seed      # Dados iniciais
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Rodar

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Acesse: http://localhost:5173

## Login de Teste

Após rodar o seed:
- Email: `igor@zeni.app`
- Senha: `123456`

## Funcionalidades

- Dashboard com resumo financeiro
- Registro de transações (manual ou por chat)
- Chat com IA para registrar gastos e tirar dúvidas
- Orçamentos por categoria

## Agentes de IA

| Agente | Função |
|--------|--------|
| Registrador | Transforma texto/foto em transação |
| CFO | Análises e planejamento |
| Guardião | Alertas de gastos |
| Educador | Explica conceitos |

## Estrutura

```
zeni/
├── backend/
│   └── src/
│       ├── routes/      # APIs REST
│       ├── agents/      # Agentes de IA
│       ├── services/    # Claude API
│       └── db/          # Schema e seeds
├── frontend/
│   └── src/
│       ├── pages/       # Dashboard, Transactions, Chat
│       ├── components/  # UI components
│       └── services/    # API client
└── docs/
    ├── PLANO-TECNICO.md
    ├── DATABASE-SCHEMA.md
    └── AGENTES-IA.md
```
