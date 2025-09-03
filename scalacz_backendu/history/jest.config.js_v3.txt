// jest.config.js (poprawiona wersja)
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'controllers/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    // USUŃ lub ZMIEŃ tę linię:
    // '__tests__/integration/.+',
  ],
  // Możesz dodać jawną definicję patternów testowych:
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.spec.js'],
};
