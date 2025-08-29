// jest.config.js
module.exports = {
  testEnvironment: 'node',
  // DODAJ tę linię: Ustawia ścieżkę do pliku env dla testów
  setupFiles: ['<rootDir>/jest.setup.js'], // Ta linia mówi Jest, aby przed testami uruchomił plik `jest.setup.js`
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
};