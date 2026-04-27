module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/rm-*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'rm-vague2-suite.test.js', // TypeScript import issues - nécessite transformation
  ],
  testTimeout: 30000,
};
