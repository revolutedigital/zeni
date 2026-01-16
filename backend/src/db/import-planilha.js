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

// Extrair mês de um range de datas como "01/01 até 07/01" ou "08/01 ate 14/01"
function extractMonthFromWeekRange(text) {
  if (!text) return null;
  const str = String(text).toLowerCase();

  // Formato: "DD/MM até DD/MM" ou "DD/MM ate DD/MM"
  const match = str.match(/(\d{1,2})\/(\d{1,2})\s*(?:até|ate)\s*(\d{1,2})\/(\d{1,2})/);
  if (match) {
    // Pegar o mês do início do range
    return parseInt(match[2], 10);
  }

  // Formato numérico Excel (número serial de data)
  if (typeof text === 'number' && text > 40000 && text < 50000) {
    // Converter número serial Excel para data
    const date = new Date((text - 25569) * 86400 * 1000);
    return date.getMonth() + 1;
  }

  return null;
}

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

// Detectar se a planilha usa formato novo (2025) com colunas repetidas por mês
function detect2025Format(data) {
  // Formato 2025/2026: linha 0 tem "CONTA" repetido e linha 1 tem datas semanais
  const firstRow = data[0] || [];
  const secondRow = data[1] || [];

  let contaCount = 0;
  for (const cell of firstRow) {
    if (String(cell || '').toLowerCase() === 'conta') contaCount++;
  }

  // Verificar se tem datas semanais na linha 1
  let hasWeeklyDates = false;
  for (const cell of secondRow) {
    if (extractMonthFromWeekRange(cell)) {
      hasWeeklyDates = true;
      break;
    }
  }

  // Formato novo se tem múltiplas CONTA ou tem datas semanais
  return contaCount >= 2 || hasWeeklyDates;
}

// Para formato 2025: mapear seções de meses {mes: {descCol, valueCols[]}}
// sectionIndex é usado para forçar meses sequenciais quando as datas estão erradas (ex: aba 2026)
function mapMonthSections2025(data, forceSequentialMonths = false) {
  const sections = {};
  const firstRow = data[0] || [];
  const secondRow = data[1] || [];

  let currentMonth = null;
  let currentDescCol = null;
  let currentValueCols = [];
  let sectionIndex = 0; // Contador de seções CONTA

  for (let col = 0; col < Math.max(firstRow.length, secondRow.length); col++) {
    const header = String(firstRow[col] || '').toLowerCase();
    const dateCell = secondRow[col];

    // Nova seção começa com "CONTA"
    if (header === 'conta') {
      // Salvar seção anterior
      if (currentMonth && currentDescCol !== null && currentValueCols.length > 0) {
        if (!sections[currentMonth]) {
          sections[currentMonth] = [];
        }
        sections[currentMonth].push({ descCol: currentDescCol, valueCols: [...currentValueCols] });
      }

      // Iniciar nova seção
      currentDescCol = col;
      currentValueCols = [];
      sectionIndex++;

      if (forceSequentialMonths) {
        // Forçar meses sequenciais: seção 1 = janeiro, seção 2 = fevereiro, etc.
        currentMonth = sectionIndex;
      } else {
        // Detectar mês das próximas colunas
        for (let i = col + 1; i < col + 10 && i < secondRow.length; i++) {
          const m = extractMonthFromWeekRange(secondRow[i]);
          if (m) {
            currentMonth = m;
            break;
          }
        }
      }
    } else if (header === 'semana' || header === 'dia') {
      // Coluna de valor
      currentValueCols.push(col);
    }
  }

  // Salvar última seção
  if (currentMonth && currentDescCol !== null && currentValueCols.length > 0) {
    if (!sections[currentMonth]) {
      sections[currentMonth] = [];
    }
    sections[currentMonth].push({ descCol: currentDescCol, valueCols: [...currentValueCols] });
  }

  return sections;
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
    const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];

    for (const year of years) {
      if (!workbook.SheetNames.includes(year)) continue;

      console.log(`\n📅 Processando ${year}...`);
      const sheet = workbook.Sheets[year];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      // Verificar se é formato 2025 (múltiplas seções por mês)
      const is2025Format = detect2025Format(data);
      console.log(`   Formato detectado: ${is2025Format ? 'Novo (2025)' : 'Tradicional'}`);

      if (is2025Format) {
        // Formato 2025: múltiplas seções com colunas CONTA + SEMANA
        // Para 2026, as datas estão erradas (ambas seções mostram janeiro), então forçamos meses sequenciais
        const forceSequential = (year === '2026');
        const monthSections = mapMonthSections2025(data, forceSequential);
        console.log(`   Seções de meses: ${JSON.stringify(Object.keys(monthSections))}${forceSequential ? ' (meses forçados sequencialmente)' : ''}`);

        for (const [month, sections] of Object.entries(monthSections)) {
          console.log(`   Processando mês ${month}...`);

          // Acumular por descrição
          const monthTotals = {}; // { description: totalValue }

          for (const section of sections) {
            for (let row = 2; row < data.length; row++) {
              const rowData = data[row];
              if (!rowData) continue;

              const description = String(rowData[section.descCol] || '').trim();
              if (!description || description === 'NaN' || description === '.' ||
                  description.toLowerCase() === 'conta' ||
                  description.toLowerCase().includes('total') ||
                  description.toLowerCase().includes('semana')) continue;

              // Somar valores das colunas de semanas
              let rowSum = 0;
              for (const col of section.valueCols) {
                const value = rowData[col];
                if (value && typeof value === 'number' && value > 0) {
                  rowSum += value;
                }
              }

              if (rowSum > 0) {
                if (!monthTotals[description]) monthTotals[description] = 0;
                monthTotals[description] += rowSum;
              }
            }
          }

          // Inserir no banco
          for (const [description, totalValue] of Object.entries(monthTotals)) {
            const categoryName = detectCategory(description);
            const categoryId = categories[categoryName];
            const type = isIncome(description) ? 'income' : 'expense';
            const date = `${year}-${String(month).padStart(2, '0')}-15`;

            try {
              await client.query(`
                INSERT INTO transactions (user_id, category_id, amount, description, date, type, source)
                VALUES ($1, $2, $3, $4, $5, $6, 'import')
                ON CONFLICT DO NOTHING
              `, [userId, categoryId, totalValue, description, date, type]);
              totalImported++;
              console.log(`   + ${description}: R$ ${totalValue.toFixed(2)} (${month}/${year})`);
            } catch (e) {
              // Ignorar erros
            }
          }
        }
      } else {
        // Formato tradicional: colunas de meses horizontais
        let monthColumns = {};
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

        // Procurar cabeçalhos de mês nas primeiras linhas
        for (let row = 0; row < Math.min(10, data.length); row++) {
          for (let col = 0; col < data[row]?.length; col++) {
            const cell = data[row][col];
            const cellStr = String(cell || '').toLowerCase().trim();

            // Formato tradicional: nome do mês
            months.forEach((month, idx) => {
              if (cellStr.includes(month) || cellStr.includes(month.substring(0, 3))) {
                const m = idx + 1;
                if (!monthColumns[m]) monthColumns[m] = [];
                if (!monthColumns[m].includes(col)) monthColumns[m].push(col);
              }
            });

            // Formato semanal: "01/01 até 07/01"
            const weekMonth = extractMonthFromWeekRange(cell);
            if (weekMonth) {
              if (!monthColumns[weekMonth]) monthColumns[weekMonth] = [];
              if (!monthColumns[weekMonth].includes(col)) monthColumns[weekMonth].push(col);
            }
          }
        }

        console.log(`   Colunas por mês: ${JSON.stringify(monthColumns)}`);

        // Identificar coluna de descrição
        let descCol = 1;
        for (let row = 0; row < Math.min(5, data.length); row++) {
          for (let col = 0; col < data[row]?.length; col++) {
            const cell = String(data[row][col] || '').toLowerCase();
            if (cell === 'conta' || cell.includes('descri')) {
              descCol = col;
              break;
            }
          }
        }

        // Processar linhas de dados
        for (let row = 2; row < data.length; row++) {
          const rowData = data[row];
          if (!rowData || !rowData.length) continue;

          const description = String(rowData[descCol] || '').trim();
          if (!description || description === 'NaN' || description.toLowerCase() === 'conta') continue;

          if (description.toLowerCase().includes('total') ||
              description.toLowerCase().includes('semana') ||
              description.toLowerCase() === 'saldo') continue;

          const categoryName = detectCategory(description);
          const categoryId = categories[categoryName];

          for (const [month, cols] of Object.entries(monthColumns)) {
            let totalValue = 0;

            for (const col of cols) {
              const value = rowData[col];
              if (value && typeof value === 'number' && value > 0) {
                totalValue += value;
              }
            }

            if (totalValue > 0) {
              const type = isIncome(description) ? 'income' : 'expense';
              const date = `${year}-${String(month).padStart(2, '0')}-15`;

              try {
                await client.query(`
                  INSERT INTO transactions (user_id, category_id, amount, description, date, type, source)
                  VALUES ($1, $2, $3, $4, $5, $6, 'import')
                  ON CONFLICT DO NOTHING
                `, [userId, categoryId, totalValue, description, date, type]);
                totalImported++;
                console.log(`   + ${description}: R$ ${totalValue.toFixed(2)} (${month}/${year})`);
              } catch (e) {
                // Ignorar erros
              }
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
