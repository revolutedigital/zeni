#!/bin/bash
set -e

echo "🔄 Executando migrações do banco de dados..."

# Executar todas as migrações
node scripts/migrate-goals.js

echo "✅ Migrações concluídas!"
echo "🚀 Iniciando servidor..."

# Iniciar o servidor
node src/index.js
