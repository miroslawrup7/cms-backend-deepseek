// jest.config.js
module.exports = {
  testEnvironment: 'node', // Środowisko dla Node.js (a nie przeglądarki)
  collectCoverageFrom: [ // Z których plików zbierać informacje o "pokryciu testami"
    'services/**/*.js',
    'controllers/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**', // wyklucz
  ],
  coverageThreshold: { // Minimalny próg % pokrycia testowego, który musi być spełniony
    global: {
      branches: 0, // Na początek ustawmy 0, potem możemy zwiększać
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};