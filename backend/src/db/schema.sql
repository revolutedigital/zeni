-- ZENI - Schema do Banco de Dados
-- PostgreSQL

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'both')),
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(500),
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    source VARCHAR(50) DEFAULT 'manual',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id, month, year)
);

-- Tabela de histórico de chat
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    agent VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_chat_user_date ON chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id, year, month);

-- Tabela de estado de conversa (para continuidade do chat)
CREATE TABLE IF NOT EXISTS conversation_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para estado de conversa
CREATE INDEX IF NOT EXISTS idx_conversation_state_updated ON conversation_state(updated_at);

-- Categorias padrão
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
    ('Outros', 'circle', '#9CA3AF', 'both')
ON CONFLICT DO NOTHING;
