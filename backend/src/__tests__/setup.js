/**
 * Jest Setup File - Zeni Backend Tests
 *
 * Runs before each test file
 */

import { jest } from '@jest/globals';

// Increase timeout for async operations
jest.setTimeout(15000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.ANTHROPIC_API_KEY = 'test-api-key';

// Global test utilities
global.createTestUser = () => ({
  id: 'test-user-id-123',
  email: 'test@zeni.app',
  name: 'Test User',
});

global.createTestToken = () => 'test-bearer-token';

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here
});
