module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/modules/vouchers.disabled/',
    '/src/modules/vouchers\\.disabled/',
    '\\.routes\\.test\\.ts$',
    '<rootDir>/tests/integration/'
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuid.ts'
  },
  collectCoverageFrom: [
    'src/**/*.service.ts',
    'src/**/*.controller.ts',
    'src/**/*.repository.ts',
    '!src/**/__tests__/**',
    '!src/modules/vouchers.disabled/**',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80
    },
    './src/modules/inscriptions/': { lines: 90, functions: 90 },
    './src/modules/paiements/': { lines: 90, functions: 90 }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
