// jest.setup.js
const path = require('path');
// Ładujemy zmienne środowiskowe Z PLIKU .env.test
require('dotenv').config({ path: path.resolve(__dirname, '.env.test') });
