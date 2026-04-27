module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.routes.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/modules/vouchers.disabled/'
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuid.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverage: false
};
