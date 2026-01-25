/**
 * Unit Tests - Claude Service
 *
 * Tests for Claude API utilities and model selection
 */

import { jest } from '@jest/globals';
import {
  calculateMessageComplexity,
  selectModel,
} from '../../services/claude.js';

describe('Claude Service', () => {
  describe('calculateMessageComplexity', () => {
    it('should return low complexity for simple messages', () => {
      const message = 'oi';
      const complexity = calculateMessageComplexity(message);

      expect(complexity).toBeLessThan(0.2);
    });

    it('should return higher complexity for long messages', () => {
      const message = 'Por favor, analise meus gastos dos últimos 6 meses, compare com o ano anterior, e me dê uma projeção para o próximo trimestre considerando a inflação e meus objetivos de economia.';
      const complexity = calculateMessageComplexity(message);

      expect(complexity).toBeGreaterThan(0.3);
    });

    it('should detect analytical keywords', () => {
      const simpleMessage = 'quanto gastei';
      const complexMessage = 'analise e compare meus gastos';

      const simpleComplexity = calculateMessageComplexity(simpleMessage);
      const complexComplexity = calculateMessageComplexity(complexMessage);

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });

    it('should detect multiple questions', () => {
      const singleQuestion = 'quanto gastei esse mês?';
      const multipleQuestions = 'quanto gastei esse mês? e qual categoria foi a maior? posso gastar mais?';

      const singleComplexity = calculateMessageComplexity(singleQuestion);
      const multipleComplexity = calculateMessageComplexity(multipleQuestions);

      expect(multipleComplexity).toBeGreaterThan(singleComplexity);
    });

    it('should consider context length', () => {
      const message = 'como estou?';
      const shortContext = calculateMessageComplexity(message, 3);
      const longContext = calculateMessageComplexity(message, 20);

      expect(longContext).toBeGreaterThan(shortContext);
    });
  });

  describe('selectModel', () => {
    it('should always use fast model for registrar', () => {
      const model = selectModel('registrar', 'gastei 50 no mercado');

      expect(model).toBe('claude-3-haiku-20240307');
    });

    it('should always use fast model for registrar_vision', () => {
      const model = selectModel('registrar_vision', 'extraia dados');

      expect(model).toBe('claude-3-haiku-20240307');
    });

    it('should use fast model for simple CFO queries', () => {
      const model = selectModel('cfo', 'quanto gastei?', 2);

      expect(model).toBe('claude-3-haiku-20240307');
    });

    it('should use balanced model for complex CFO queries with high complexity', () => {
      // Message with multiple complexity factors: long, analytical words, temporal, multiple questions
      const complexMessage = 'Por favor, analise detalhadamente meus gastos de 2025, compare com a tendência de 2024, projete cenários para o ano que vem? Qual estratégia você recomenda? Como posso otimizar?';
      const model = selectModel('cfo', complexMessage, 20);

      // Check that complexity triggers balanced model (> 0.5)
      expect(model).toBe('claude-sonnet-4-20250514');
    });

    it('should use fast model for simple educator queries', () => {
      const model = selectModel('educator', 'o que é CDI?', 0);

      expect(model).toBe('claude-3-haiku-20240307');
    });

    it('should use balanced model for complex planner queries with high complexity', () => {
      // Message with multiple complexity factors
      const complexMessage = 'Por favor, analise detalhadamente se é possível eu juntar 50 mil para uma viagem até dezembro de 2026? Compare com meus gastos atuais? Qual estratégia você recomenda? Como posso otimizar meu planejamento?';
      const model = selectModel('planner', complexMessage, 15);

      expect(model).toBe('claude-sonnet-4-20250514');
    });
  });
});
