/**
 * Jest Configuration for Zeni Backend
 */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/src/__tests__/**/*.test.js'],

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/db/migrate.js',
    '!src/db/seed.js',
    '!src/__tests__/**/*.js',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Note: Coverage thresholds disabled for initial setup
  // Enable and increase as test coverage improves
  // coverageThreshold: {
  //   global: {
  //     branches: 20,
  //     functions: 20,
  //     lines: 20,
  //     statements: 20,
  //   },
  // },

  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  verbose: true,
  testTimeout: 15000,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
};
