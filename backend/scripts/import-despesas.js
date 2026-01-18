import pg from 'pg';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mapeamento de categorias da planilha para o sistema
const CATEGORY_MAPPING = {
  'Beleza/Estética': { name: 'Beleza', type: 'expense', icon: '💅', color: '#EC4899' },
  'Internet/Telefone': { name: 'Internet/Telefone', type: 'expense', icon: '📱', color: '#6366F1' },
  'Mercado': { name: 'Mercado', type: 'expense', icon: '🛒', color: '#10B981' },
  'Cartões de Crédito': { name: 'Cartão de Crédito', type: 'expense', icon: '💳', color: '#EF4444' },
  'Financiamento Imóvel': { name: 'Financiamento', type: 'expense', icon: '🏠', color: '#F59E0B' },
  'Escola': { name: 'Educação', type: 'expense', icon: '📚', color: '#8B5CF6' },
  'Manutenção Veículo': { name: 'Carro', type: 'expense', icon: '🚗', color: '#3B82F6' },
  'Ajuda Familiares': { name: 'Família', type: 'expense', icon: '👨‍👩‍👧', color: '#EC4899' },
  'Outros': { name: 'Outros', type: 'expense', icon: '📦', color: '#6B7280' },
  'Limpeza/Doméstica': { name: 'Casa', type: 'expense', icon: '🏡', color: '#14B8A6' },
  'Convênio/Saúde': { name: 'Saúde', type: 'expense', icon: '🏥', color: '#EF4444' },
  'Restaurante': { name: 'Restaurante', type: 'expense', icon: '🍽️', color: '#F97316' },
  'Energia/Água/Gás': { name: 'Contas', type: 'expense', icon: '💡', color: '#FBBF24' },
  'Streaming': { name: 'Streaming', type: 'expense', icon: '📺', color: '#E11D48' },
  'Seguro': { name: 'Seguro', type: 'expense', icon: '🛡️', color: '#0EA5E9' },
  'IPTU/IPVA': { name: 'Impostos', type: 'expense', icon: '📋', color: '#64748B' },
  'Academia': { name: 'Academia', type: 'expense', icon: '🏋️', color: '#22C55E' },
  'Condomínio': { name: 'Condomínio', type: 'expense', icon: '🏢', color: '#A855F7' },
  'Farmácia': { name: 'Farmácia', type: 'expense', icon: '💊', color: '#06B6D4' },
  'Roupas': { name: 'Roupas', type: 'expense', icon: '👕', color: '#D946EF' },
  'Viagem': { name: 'Viagem', type: 'expense', icon: '✈️', color: '#0EA5E9' },
  'Lazer': { name: 'Lazer', type: 'expense', icon: '🎉', color: '#F472B6' },
  'Pet': { name: 'Pet', type: 'expense', icon: '🐕', color: '#A3E635' },
  'Presente': { name: 'Presentes', type: 'expense', icon: '🎁', color: '#FB7185' },
  'Investimento': { name: 'Investimento', type: 'expense', icon: '📈', color: '#34D399' },
  'Combustível': { name: 'Combustível', type: 'expense', icon: '⛽', color: '#FBBF24' },
  'Transporte': { name: 'Transporte', type: 'expense', icon: '🚌', color: '#818CF8' },
  'Educação Extra': { name: 'Cursos', type: 'expense', icon: '🎓', color: '#C084FC' },
};

async function importDespesas() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando importação...');

    // Ler arquivo Excel
    const filePath = path.join(__dirname, '..', '..', '..', 'DESPESAS_FINAL.xlsx');
    console.log(`📂 Lendo arquivo: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Despesas'];
    // raw: false para formatar datas corretamente
    const data = xlsx.utils.sheet_to_json(sheet, { raw: false });

    console.log(`📊 Encontradas ${data.length} transações`);

    // Buscar userId (pegar o primeiro usuário)
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error('Nenhum usuário encontrado. Crie um usuário primeiro.');
    }
    const userId = userResult.rows[0].id;
    console.log(`👤 Importando para userId: ${userId}`);

    await client.query('BEGIN');

    // 1. Apagar transações existentes do usuário
    console.log('🗑️  Apagando transações existentes...');
    const deleteResult = await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    console.log(`   Removidas ${deleteResult.rowCount} transações`);

    // 2. Apagar orçamentos existentes
    console.log('🗑️  Apagando orçamentos existentes...');
    await client.query('DELETE FROM budgets WHERE user_id = $1', [userId]);

    // 3. Apagar categorias existentes (tabela global, não por usuário)
    console.log('🗑️  Apagando categorias existentes...');
    await client.query('DELETE FROM categories');

    // 4. Criar categorias únicas da planilha
    console.log('📁 Criando categorias...');
    const uniqueCategories = [...new Set(data.map(row => row.Categoria))];
    const categoryMap = new Map();

    for (const catName of uniqueCategories) {
      const mapping = CATEGORY_MAPPING[catName] || {
        name: catName,
        type: 'expense',
        icon: '📦',
        color: '#6B7280'
      };

      const result = await client.query(`
        INSERT INTO categories (name, type, icon, color)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [mapping.name, mapping.type, mapping.icon, mapping.color]);

      categoryMap.set(catName, result.rows[0].id);
    }
    console.log(`   Criadas ${categoryMap.size} categorias`);

    // 5. Importar transações
    console.log('💰 Importando transações...');
    let imported = 0;
    let errors = 0;

    for (const row of data) {
      try {
        const categoryId = categoryMap.get(row.Categoria);

        // Parsear data no formato DD/MM/YYYY
        let date;
        if (row.Data && row.Data.includes('/')) {
          const [day, month, year] = row.Data.split('/');
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(row.Data);
        }

        // Parsear valor
        // Formato xlsx: "180.00" (americano) ou "1,000.00" (americano com milhares)
        let amount = row.Valor;
        if (typeof amount === 'string') {
          // Remove vírgulas usadas como separador de milhares no formato americano
          amount = parseFloat(amount.replace(/,/g, ''));
        } else {
          amount = parseFloat(amount);
        }

        const description = row['Descrição'] || row.Categoria;

        if (isNaN(amount) || amount <= 0) {
          errors++;
          continue;
        }

        await client.query(`
          INSERT INTO transactions (user_id, amount, description, date, type, category_id, source, paid)
          VALUES ($1, $2, $3, $4, 'expense', $5, 'import', true)
        `, [userId, amount, description, date, categoryId]);

        imported++;

        if (imported % 100 === 0) {
          console.log(`   Importadas ${imported}/${data.length}...`);
        }
      } catch (err) {
        errors++;
        console.error(`   Erro na linha: ${JSON.stringify(row)}: ${err.message}`);
      }
    }

    await client.query('COMMIT');

    console.log('');
    console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
    console.log(`   Total importado: ${imported}`);
    console.log(`   Erros: ${errors}`);

    // Mostrar resumo por ano
    const summary = await client.query(`
      SELECT
        EXTRACT(YEAR FROM date) as year,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1
      GROUP BY EXTRACT(YEAR FROM date)
      ORDER BY year
    `, [userId]);

    console.log('');
    console.log('📊 RESUMO POR ANO:');
    for (const row of summary.rows) {
      console.log(`   ${row.year}: ${row.count} transações, R$ ${parseFloat(row.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importDespesas();
