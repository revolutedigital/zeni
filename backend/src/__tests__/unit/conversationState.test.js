/**
 * Unit Tests - Conversation State Service
 *
 * Tests for conversation state extraction and management
 */

import { jest } from '@jest/globals';
import {
  extractStateFromResponse,
  resolveShortResponse,
  PENDING_ACTIONS,
} from '../../services/conversationState.js';

describe('ConversationState Service', () => {
  describe('extractStateFromResponse', () => {
    it('should detect question patterns correctly', () => {
      const response = 'Você gastou R$500 esse mês. Quer que eu crie um orçamento?';
      const state = extractStateFromResponse(response, 'cfo');

      expect(state.awaitingConfirmation).toBe(true);
      expect(state.lastAgent).toBe('cfo');
      expect(state.lastQuestion).toContain('orçamento');
    });

    it('should detect budget creation intent', () => {
      const response = 'Posso criar um orçamento baseado nos seus gastos.';
      const state = extractStateFromResponse(response, 'cfo');

      expect(state.pendingAction).toBe(PENDING_ACTIONS.CREATE_BUDGET);
    });

    it('should detect transaction confirmation intent', () => {
      const response = 'Entendi! Quer que eu registre R$50 em Mercado?';
      const state = extractStateFromResponse(response, 'registrar');

      expect(state.pendingAction).toBe(PENDING_ACTIONS.CONFIRM_TRANSACTION);
      expect(state.awaitingConfirmation).toBe(true);
    });

    it('should extract monetary values correctly', () => {
      const response = 'Você tem R$1.500,00 disponível em Restaurante.';
      const state = extractStateFromResponse(response, 'guardian');

      expect(state.context.lastMentionedValue).toBe(1500);
    });

    it('should extract categories mentioned', () => {
      const response = 'Seus gastos em restaurante e mercado estão altos.';
      const state = extractStateFromResponse(response, 'cfo');

      expect(state.context.lastMentionedCategories).toContain('restaurante');
      expect(state.context.lastMentionedCategories).toContain('mercado');
    });

    it('should detect month references', () => {
      const response = 'Em janeiro você gastou muito.';
      const state = extractStateFromResponse(response, 'cfo');

      expect(state.context.lastMentionedMonth).toBe(1);
    });

    it('should detect year references', () => {
      const response = 'Em 2025 você economizou R$10.000.';
      const state = extractStateFromResponse(response, 'cfo');

      expect(state.context.lastMentionedYear).toBe(2025);
    });
  });

  describe('resolveShortResponse', () => {
    const mockState = {
      pendingAction: PENDING_ACTIONS.CREATE_BUDGET,
      context: { lastMentionedValue: 1000 },
    };

    it('should resolve affirmative responses', () => {
      const testCases = ['sim', 'quero', 'ok', 'pode', 'claro', 'bora'];

      testCases.forEach(response => {
        const resolved = resolveShortResponse(response, mockState);
        expect(resolved).not.toBeNull();
        expect(resolved.confirmed).toBe(true);
        expect(resolved.action).toBe(PENDING_ACTIONS.CREATE_BUDGET);
      });
    });

    it('should resolve negative responses', () => {
      const testCases = ['não', 'nao', 'cancela', 'deixa'];

      testCases.forEach(response => {
        const resolved = resolveShortResponse(response, mockState);
        expect(resolved).not.toBeNull();
        expect(resolved.confirmed).toBe(false);
        expect(resolved.action).toBe('cancel');
      });
    });

    it('should resolve help requests', () => {
      const resolved = resolveShortResponse('me ajuda', mockState);

      expect(resolved).not.toBeNull();
      expect(resolved.action).toBe('recommend');
    });

    it('should return null for unrecognized responses', () => {
      const resolved = resolveShortResponse('quanto gastei ontem?', mockState);

      expect(resolved).toBeNull();
    });

    it('should return null when no pending action', () => {
      const emptyState = { pendingAction: null, context: {} };
      const resolved = resolveShortResponse('sim', emptyState);

      expect(resolved).toBeNull();
    });
  });
});
