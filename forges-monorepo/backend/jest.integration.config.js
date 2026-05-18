require('dotenv').config();

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.integration.json',
    },
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.routes.test.ts', '**/tests/integration/**/*.test.js', '**/tests/integration/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/modules/vouchers.disabled/'
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuid.integration.ts',
    '^modules/(.*)$': '<rootDir>/src/modules/$1',
    '^shared/(.*)$': '<rootDir>/src/shared/$1',
    '^config/(.*)$': '<rootDir>/src/config/$1',
  },
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverage: false,
  testTimeout: 30000
};
