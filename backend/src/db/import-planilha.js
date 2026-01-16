import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import pool from './connection.js';

// Mapeamento de categorias da planilha para o sistema
const CATEGORY_MAP = {
  'mercado': 'Mercado',
  'restaurante': 'Restaurante',
  'salao': 'Salão/Estética',
  'salão': 'Salão/Estética',
  'roupas': 'Vestuário',
  'vestuario': 'Vestuário',
  'procedimentos': 'Saúde',
  'limpeza': 'Limpeza',
  'vacinas': 'Saúde',
  'saude': 'Saúde',
  'farmacia': 'Saúde',
  'medico': 'Saúde',
  'convenio': 'Saúde',
  'carro': 'Carro',
  'gasolina': 'Carro',
  'combustivel': 'Carro',
  'ipva': 'Carro',
  'condominio': 'Casa',
  'aluguel': 'Casa',
  'luz': 'Casa',
  'agua': 'Casa',
  'internet': 'Casa',
  'financiamento': 'Financiamento',
  'parcela': 'Financiamento',
  'escola': 'Educação',
  'educacao': 'Educação',
  'curso': 'Educação',
  'mae': 'Ajuda Família',
  'magda': 'Ajuda Família',
  'ester': 'Ajuda Família',
  'investimento': 'Investimento',
  'previdencia': 'Investimento',
  'lazer': 'Lazer/Passeio',
  'passeio': 'Lazer/Passeio',
  'viagem': 'Lazer/Passeio',
  'nubank': 'Cartão de Crédito',
  'c6': 'Cartão de Crédito',
  'brasilcard': 'Cartão de Crédito',
  'cartao': 'Cartão de Crédito',
  'salario': 'Salário',
  'recebimento': 'Salário',
};

function detectCategory(description) {
  if (!description) return 'Outros';
  const desc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (desc.includes(key)) {
      return value;
    }
  }
  return 'Outros';
}

function isIncome(description) {
  if (!description) return false;
  const desc = description.toLowerCase();
  return desc.includes('salario') ||
         desc.includes('recebimento') ||
         desc.includes('entrada') ||
         desc.includes('renda');
}

async function importPlanilha(filePath, userId) {
  const client = await pool.connect();

  try {
    console.log('📊 Lendo planilha...');
    const workbook = XLSX.readFile(filePath);

    // Buscar categorias do banco
    const catResult = await client.query('SELECT id, name FROM categories');
    const categories = {};
    catResult.rows.forEach(cat => {
      categories[cat.name] = cat.id;
    });

    let totalImported = 0;
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];

    for (const year of years) {
      if (!workbook.SheetNames.includes(year)) continue;

      console.log(`\n📅 Processando ${year}...`);
      const sheet = workbook.Sheets[year];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      // Encontrar colunas de meses
      let monthColumns = {};
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

      // Procurar cabeçalhos de mês nas primeiras linhas
      for (let row = 0; row < Math.min(10, data.length); row++) {
        for (let col = 0; col < data[row]?.length; col++) {
          const cell = String(data[row][col] || '').toLowerCase().trim();
          months.forEach((month, idx) => {
            if (cell.includes(month) || cell.includes(month.substring(0, 3))) {
              monthColumns[idx + 1] = col; // mês 1-12
            }
          });
        }
      }

      // Processar linhas de dados
      for (let row = 5; row < data.length; row++) {
        const rowData = data[row];
        if (!rowData || !rowData.length) continue;

        // Coluna 1 geralmente é o dia ou descrição
        const description = String(rowData[1] || '').trim();
        if (!description || description === 'NaN') continue;

        // Detectar categoria
        const categoryName = detectCategory(description);
        const categoryId = categories[categoryName];

        // Procurar valores nas colunas de meses
        for (const [month, col] of Object.entries(monthColumns)) {
          const value = rowData[col];
          if (value && typeof value === 'number' && value > 0) {
            const type = isIncome(description) ? 'income' : 'expense';
            const date = `${year}-${String(month).padStart(2, '0')}-15`; // meio do mês

            try {
              await client.query(`
                INSERT INTO transactions (user_id, category_id, amount, description, date, type, source)
                VALUES ($1, $2, $3, $4, $5, $6, 'import')
                ON CONFLICT DO NOTHING
              `, [userId, categoryId, value, description, date, type]);
              totalImported++;
            } catch (e) {
              // Ignorar erros de inserção duplicada
            }
          }
        }
      }
    }

    console.log(`\n✅ Total importado: ${totalImported} transações`);
    return totalImported;

  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar se chamado diretamente
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Uso: node import-planilha.js <arquivo.xlsx> <user_id>');
  console.log('Exemplo: node import-planilha.js planilha.xlsx abc-123-def');
  process.exit(1);
}

const [filePath, userId] = args;
importPlanilha(filePath, userId)
  .then(() => {
    console.log('🎉 Importação concluída!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });

export { importPlanilha };
