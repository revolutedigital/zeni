/**
 * Testes do Orchestrator - Roteamento de Agentes
 *
 * Testa se as mensagens são roteadas para os agentes corretos
 */

// Mock do Claude API antes de importar
const mockCallClaude = jest.fn().mockResolvedValue('{"success": true}');
jest.unstable_mockModule('../services/claude.js', () => ({
  callClaude: mockCallClaude,
  callClaudeVision: jest.fn(),
}));

// Mock do conversationState
jest.unstable_mockModule('../services/conversationState.js', () => ({
  resolveShortResponse: jest.fn().mockReturnValue(null),
  getStateInstruction: jest.fn().mockReturnValue(''),
  extractStateFromResponse: jest.fn().mockReturnValue({}),
  PENDING_ACTIONS: {
    CREATE_BUDGET: 'create_budget',
    CONFIRM_TRANSACTION: 'confirm_transaction',
  },
}));

describe('Orchestrator - routeToAgent', () => {
  let routeToAgent;

  beforeAll(async () => {
    const module = await import('../agents/orchestrator.js');
    routeToAgent = module.routeToAgent;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Detecção de Transações (Registrador)', () => {
    const transactionCases = [
      ['50 mercado', 'registrar'],
      ['gastei 100 no restaurante', 'registrar'],
      ['paguei 200 de luz', 'registrar'],
      ['uber 23,90', 'registrar'],
      ['recebi 5000 de salário', 'registrar'],
      ['mercado 150', 'registrar'],
      ['R$50 ifood', 'registrar'],
      ['comprei 80 reais de gasolina', 'registrar'],
    ];

    test.each(transactionCases)('"%s" deve ir para %s', (input, expectedAgent) => {
      const agent = routeToAgent(input, {}, []);
      expect(agent).toBe(expectedAgent);
    });
  });

  describe('Detecção de Análise Financeira (CFO)', () => {
    const cfoCases = [
      ['como estou?', 'cfo'],
      ['como estou esse mês?', 'cfo'],
      ['resume meu mês', 'cfo'],
      ['quanto gastei?', 'cfo'],
      ['onde mais gasto?', 'cfo'],
      ['meus gastos', 'cfo'],
      ['minhas finanças', 'cfo'],
      ['estou no vermelho?', 'cfo'],
      ['saldo', 'cfo'],
      ['como foi meu 2024', 'cfo'],
      ['quanto gastei em 2025', 'cfo'],
    ];

    test.each(cfoCases)('"%s" deve ir para %s', (input, expectedAgent) => {
      const agent = routeToAgent(input, {}, []);
      expect(agent).toBe(expectedAgent);
    });
  });

  describe('Detecção de Consulta de Gasto (Guardian)', () => {
    const guardianCases = [
      ['posso gastar 200?', 'guardian'],
      ['dá pra comprar um celular?', 'guardian'],
      ['tenho dinheiro pra sair?', 'guardian'],
      ['cabe no orçamento?', 'guardian'],
      ['quero gastar 500', 'guardian'],
    ];

    test.each(guardianCases)('"%s" deve ir para %s', (input, expectedAgent) => {
      const agent = routeToAgent(input, {}, []);
      expect(agent).toBe(expectedAgent);
    });
  });

  describe('Detecção de Perguntas Educacionais (Educator)', () => {
    const educatorCases = [
      ['o que é CDI?', 'educator'],
      ['como funciona o tesouro direto?', 'educator'],
      ['me explica inflação', 'educator'],
      ['qual a diferença entre CDB e LCI?', 'educator'],
      ['o que significa selic?', 'educator'],
      ['pra que serve reserva de emergência?', 'educator'],
      ['vale a pena investir em ações?', 'educator'],
    ];

    test.each(educatorCases)('"%s" deve ir para %s', (input, expectedAgent) => {
      const agent = routeToAgent(input, {}, []);
      expect(agent).toBe(expectedAgent);
    });
  });

  describe('Detecção de Imagem (Vision)', () => {
    test('deve ir para registrar_vision quando há imagem', () => {
      const agent = routeToAgent('', { hasImage: true }, []);
      expect(agent).toBe('registrar_vision');
    });
  });

  describe('Continuação de Conversa', () => {
    test('resposta curta "sim" após pergunta sobre orçamento vai para CFO', () => {
      const history = [
        { role: 'assistant', content: 'Quer que eu te ajude a montar um orçamento?' },
      ];
      const agent = routeToAgent('sim', {}, history);
      expect(agent).toBe('cfo');
    });

    test('resposta curta "quero" após análise vai para CFO', () => {
      const history = [
        { role: 'assistant', content: 'Você gastou R$5000 esse mês. Quer detalhes?' },
      ];
      const agent = routeToAgent('quero', {}, history);
      expect(agent).toBe('cfo');
    });

    test('pedido de recomendação após análise vai para CFO', () => {
      const history = [
        { role: 'assistant', content: 'Seus gastos estão altos em restaurante.' },
      ];
      const agent = routeToAgent('o que você indica?', {}, history);
      expect(agent).toBe('cfo');
    });
  });

  describe('Casos Ambíguos (Default CFO)', () => {
    const defaultCases = [
      ['olá', 'cfo'],
      ['oi', 'cfo'],
      ['ajuda', 'cfo'], // Sem contexto, vai para CFO
      ['', 'cfo'],
    ];

    test.each(defaultCases)('"%s" deve ir para %s (default)', (input, expectedAgent) => {
      const agent = routeToAgent(input, {}, []);
      expect(agent).toBe(expectedAgent);
    });
  });
});

describe('Orchestrator - Edge Cases', () => {
  let routeToAgent;

  beforeAll(async () => {
    const module = await import('../agents/orchestrator.js');
    routeToAgent = module.routeToAgent;
  });

  test('mensagem muito longa é processada corretamente', () => {
    const longMessage = 'gastei 100 no mercado '.repeat(100);
    const agent = routeToAgent(longMessage, {}, []);
    expect(agent).toBe('registrar');
  });

  test('mensagem com caracteres especiais é processada', () => {
    const agent = routeToAgent('gastei R$50,00 no café ☕', {}, []);
    expect(agent).toBe('registrar');
  });

  test('mensagem em maiúsculas funciona', () => {
    const agent = routeToAgent('GASTEI 100 NO MERCADO', {}, []);
    expect(agent).toBe('registrar');
  });

  test('mensagem com espaços extras funciona', () => {
    const agent = routeToAgent('   como   estou   ?   ', {}, []);
    expect(agent).toBe('cfo');
  });
});
