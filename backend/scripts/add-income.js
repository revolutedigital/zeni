import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false }
});

async function addIncome() {
  const client = await pool.connect();

  try {
    console.log('🚀 Adicionando receitas para equilibrar despesas...\n');

    // Buscar userId
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error('Nenhum usuário encontrado.');
    }
    const userId = userResult.rows[0].id;

    // Buscar ou criar categoria de Salário
    let salaryCategory = await client.query(
      "SELECT id FROM categories WHERE name = 'Salário' AND type = 'income'"
    );

    if (salaryCategory.rows.length === 0) {
      salaryCategory = await client.query(`
        INSERT INTO categories (name, type, icon, color)
        VALUES ('Salário', 'income', '💰', '#22C55E')
        RETURNING id
      `);
    }
    const salaryCategoryId = salaryCategory.rows[0].id;

    // Buscar despesas por mês até dez/2025
    const expenses = await client.query(`
      SELECT
        EXTRACT(YEAR FROM date)::int as year,
        EXTRACT(MONTH FROM date)::int as month,
        SUM(amount) as total
      FROM transactions
      WHERE type = 'expense'
        AND date <= '2025-12-31'
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
      ORDER BY year, month
    `);

    await client.query('BEGIN');

    // Primeiro, remover receitas existentes (se houver)
    await client.query("DELETE FROM transactions WHERE type = 'income' AND user_id = $1", [userId]);

    let totalAdded = 0;
    let count = 0;

    for (const row of expenses.rows) {
      const { year, month, total } = row;
      const amount = parseFloat(total);

      // Criar receita no dia 5 de cada mês (dia do pagamento típico)
      const date = new Date(year, month - 1, 5);

      await client.query(`
        INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, paid)
        VALUES ($1, $2, $3, $4, 'income', $5, 'import', true)
      `, [userId, amount, `Salário ${month}/${year}`, date, salaryCategoryId]);

      totalAdded += amount;
      count++;

      console.log(`✅ ${year}/${String(month).padStart(2, '0')}: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(50));
    console.log(`✅ RECEITAS ADICIONADAS COM SUCESSO!`);
    console.log(`   Total: ${count} meses`);
    console.log(`   Valor: R$ ${totalAdded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log('='.repeat(50));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addIncome();
