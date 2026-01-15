# ZENI - Schema do Banco de Dados

## Visão Geral

PostgreSQL com estrutura simples e direta, modelada a partir dos dados reais da planilha do Igor.

---

## Diagrama ER

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │   transactions   │       │  categories  │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)          │    ┌──│ id (PK)      │
│ name         │  │    │ user_id (FK)     │────┘  │ name         │
│ email        │  └───▶│ category_id (FK) │       │ icon         │
│ password     │       │ amount           │       │ color        │
│ created_at   │       │ description      │       │ type         │
└──────────────┘       │ date             │       └──────────────┘
                       │ type             │
       ┌───────────────│ source           │
       │               │ created_at       │
       │               └──────────────────┘
       │
       ▼
┌──────────────┐       ┌──────────────────┐
│   budgets    │       │  chat_history    │
├──────────────┤       ├──────────────────┤
│ id (PK)      │       │ id (PK)          │
│ user_id (FK) │       │ user_id (FK)     │
│ category_id  │       │ role             │
│ amount       │       │ content          │
│ month        │       │ agent            │
│ year         │       │ created_at       │
└──────────────┘       └──────────────────┘
```

---

## Tabelas

### users

Usuários do sistema.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### categories

Categorias de transações. Pré-populadas com base na planilha do Igor.

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'both')),
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorias iniciais (baseadas na planilha)
INSERT INTO categories (name, icon, color, type) VALUES
    ('Salário', 'wallet', '#22C55E', 'income'),
    ('Mercado', 'shopping-cart', '#F97316', 'expense'),
    ('Restaurante', 'utensils', '#EF4444', 'expense'),
    ('Salão/Estética', 'scissors', '#EC4899', 'expense'),
    ('Limpeza', 'home', '#8B5CF6', 'expense'),
    ('Casa', 'building', '#6366F1', 'expense'),
    ('Financiamento', 'landmark', '#3B82F6', 'expense'),
    ('Saúde', 'heart-pulse', '#14B8A6', 'expense'),
    ('Educação', 'graduation-cap', '#F59E0B', 'expense'),
    ('Carro', 'car', '#64748B', 'expense'),
    ('Ajuda Família', 'users', '#A855F7', 'expense'),
    ('Vestuário', 'shirt', '#F472B6', 'expense'),
    ('Investimento', 'trending-up', '#10B981', 'expense'),
    ('Lazer/Passeio', 'plane', '#06B6D4', 'expense'),
    ('Cartão de Crédito', 'credit-card', '#EF4444', 'expense'),
    ('Outros', 'circle', '#9CA3AF', 'both');
```

---

### transactions

Transações financeiras (gastos e receitas).

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(500),
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    source VARCHAR(50) DEFAULT 'manual',
    -- source: 'manual', 'text', 'photo', 'import'
    metadata JSONB,
    -- metadata: dados extras (merchant, local, etc)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
```

---

### budgets

Orçamentos mensais por categoria.

```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id, month, year)
);

-- Orçamentos iniciais do Igor (baseados na planilha)
-- Serão inseridos via seed após criar o usuário
```

---

### chat_history

Histórico de conversas com os agentes de IA.

```sql
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    agent VARCHAR(50),
    -- agent: 'cfo', 'guardian', 'educator', 'registrar', null
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_user_date ON chat_history(user_id, created_at DESC);
```

---

## Views Úteis

### Resumo mensal por categoria

```sql
CREATE VIEW v_monthly_summary AS
SELECT
    user_id,
    category_id,
    c.name as category_name,
    EXTRACT(MONTH FROM date) as month,
    EXTRACT(YEAR FROM date) as year,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
    COUNT(*) as transaction_count
FROM transactions t
JOIN categories c ON t.category_id = c.id
GROUP BY user_id, category_id, c.name,
         EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date);
```

### Orçamento vs Real

```sql
CREATE VIEW v_budget_vs_actual AS
SELECT
    b.user_id,
    b.category_id,
    c.name as category_name,
    b.month,
    b.year,
    b.amount as budget,
    COALESCE(SUM(t.amount), 0) as actual,
    b.amount - COALESCE(SUM(t.amount), 0) as remaining,
    ROUND((COALESCE(SUM(t.amount), 0) / b.amount) * 100, 1) as percent_used
FROM budgets b
JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON
    t.user_id = b.user_id AND
    t.category_id = b.category_id AND
    EXTRACT(MONTH FROM t.date) = b.month AND
    EXTRACT(YEAR FROM t.date) = b.year AND
    t.type = 'expense'
GROUP BY b.user_id, b.category_id, c.name, b.month, b.year, b.amount;
```

---

## Seed de Dados

Script para importar dados da planilha do Igor:

```javascript
// seed.js - Estrutura básica
const IGOR_BUDGETS = [
    { category: 'Salão/Estética', amount: 800 },
    { category: 'Mercado', amount: 2000 },
    { category: 'Restaurante', amount: 800 },
    { category: 'Lazer/Passeio', amount: 1600 },
    { category: 'Limpeza', amount: 2400 },
    { category: 'Casa', amount: 1800 },
    { category: 'Financiamento', amount: 4200 },
    { category: 'Saúde', amount: 2800 },
    { category: 'Educação', amount: 2600 },
    { category: 'Carro', amount: 3600 },
    { category: 'Ajuda Família', amount: 2000 },
    { category: 'Vestuário', amount: 800 },
    { category: 'Investimento', amount: 6000 },
];

// Total orçado: ~R$ 31.000/mês
```

---

## Queries Frequentes

### Total gasto no mês atual

```sql
SELECT SUM(amount) as total
FROM transactions
WHERE user_id = $1
  AND type = 'expense'
  AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE);
```

### Gastos por categoria (mês atual)

```sql
SELECT
    c.name,
    c.color,
    SUM(t.amount) as total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY c.id, c.name, c.color
ORDER BY total DESC;
```

### Comparativo com mês anterior

```sql
WITH current_month AS (
    SELECT SUM(amount) as total
    FROM transactions
    WHERE user_id = $1 AND type = 'expense'
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
),
previous_month AS (
    SELECT SUM(amount) as total
    FROM transactions
    WHERE user_id = $1 AND type = 'expense'
      AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND date < DATE_TRUNC('month', CURRENT_DATE)
)
SELECT
    cm.total as current,
    pm.total as previous,
    cm.total - pm.total as difference,
    ROUND(((cm.total - pm.total) / pm.total) * 100, 1) as percent_change
FROM current_month cm, previous_month pm;
```

---

## Migração Futura

Campos planejados para futuras versões:

```sql
-- Para Open Finance (futuro)
ALTER TABLE transactions ADD COLUMN external_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN bank_account VARCHAR(50);

-- Para recorrências (futuro)
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(12,2),
    description VARCHAR(500),
    frequency VARCHAR(20), -- 'monthly', 'weekly', 'yearly'
    day_of_month INTEGER,
    active BOOLEAN DEFAULT true
);
```
