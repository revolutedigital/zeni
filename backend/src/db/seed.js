import bcrypt from 'bcrypt';
import pool from './connection.js';

// Orçamentos do Igor baseados na planilha
const BUDGETS = [
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

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando seed...');

    // Criar usuário Igor
    const passwordHash = await bcrypt.hash('123456', 10);

    const userResult = await client.query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET name = $1
      RETURNING id
    `, ['Igor', 'igor@zeni.app', passwordHash]);

    const userId = userResult.rows[0].id;
    console.log('✅ Usuário Igor criado/atualizado');

    // Buscar categorias
    const categoriesResult = await client.query('SELECT id, name FROM categories');
    const categories = {};
    categoriesResult.rows.forEach(cat => {
      categories[cat.name] = cat.id;
    });

    // Criar orçamentos para o mês atual
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    for (const budget of BUDGETS) {
      const categoryId = categories[budget.category];
      if (!categoryId) {
        console.log(`⚠️ Categoria não encontrada: ${budget.category}`);
        continue;
      }

      await client.query(`
        INSERT INTO budgets (user_id, category_id, amount, month, year)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, category_id, month, year)
        DO UPDATE SET amount = $3
      `, [userId, categoryId, budget.amount, month, year]);
    }

    console.log('✅ Orçamentos criados para', `${month}/${year}`);

    // Criar algumas transações de exemplo
    const sampleTransactions = [
      { category: 'Salário', amount: 15000, type: 'income', description: 'Salário', daysAgo: 10 },
      { category: 'Mercado', amount: 450, type: 'expense', description: 'Compras Extra', daysAgo: 8 },
      { category: 'Mercado', amount: 230, type: 'expense', description: 'Compras rápidas', daysAgo: 5 },
      { category: 'Restaurante', amount: 89, type: 'expense', description: 'Almoço', daysAgo: 7 },
      { category: 'Restaurante', amount: 156, type: 'expense', description: 'Jantar', daysAgo: 3 },
      { category: 'Carro', amount: 250, type: 'expense', description: 'Gasolina', daysAgo: 6 },
      { category: 'Financiamento', amount: 4200, type: 'expense', description: 'Parcela apartamento', daysAgo: 10 },
      { category: 'Saúde', amount: 890, type: 'expense', description: 'Convênio', daysAgo: 5 },
      { category: 'Limpeza', amount: 600, type: 'expense', description: 'Marli', daysAgo: 7 },
      { category: 'Educação', amount: 1300, type: 'expense', description: 'Escola Helena', daysAgo: 5 },
    ];

    for (const t of sampleTransactions) {
      const categoryId = categories[t.category];
      if (!categoryId) continue;

      const date = new Date();
      date.setDate(date.getDate() - t.daysAgo);

      await client.query(`
        INSERT INTO transactions (user_id, category_id, amount, type, description, date, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, categoryId, t.amount, t.type, t.description, date.toISOString().split('T')[0], 'seed']);
    }

    console.log('✅ Transações de exemplo criadas');
    console.log('\n📝 Login: igor@zeni.app / 123456');
    console.log('✅ Seed concluído!');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
