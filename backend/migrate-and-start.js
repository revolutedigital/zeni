#!/usr/bin/env node
/**
 * Script de inicialização do Railway
 * Executa migrações antes de iniciar o servidor
 */

import { spawn } from 'child_process';

console.log('🔄 Executando migrações do banco de dados...');

// Executar migração de goals
const migrate = spawn('node', ['scripts/migrate-goals.js'], {
  stdio: 'inherit'
});

migrate.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Erro ao executar migrações');
    process.exit(code);
  }

  console.log('✅ Migrações concluídas!');
  console.log('🚀 Iniciando servidor...');

  // Iniciar o servidor
  const server = spawn('node', ['src/index.js'], {
    stdio: 'inherit'
  });

  server.on('close', (code) => {
    process.exit(code);
  });
});

// Capturar sinais de término
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Encerrando servidor...');
  process.exit(0);
});
