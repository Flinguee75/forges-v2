module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/integration/**/*.test.js'],
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuid.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
