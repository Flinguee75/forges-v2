module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.routes.test.ts', '**/tests/integration/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/modules/vouchers.disabled/'
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuid.integration.ts'
  },
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverage: false,
  testTimeout: 30000
};
