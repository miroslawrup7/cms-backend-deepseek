// utils/logger.js
const winston = require('winston');
const path = require('path');

// Definiuj format logów dla developmentu (kolorowy, czytelny)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Definiuj format logów dla productionu (JSON, strukturalny)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json() // Loguje jako JSON dla łatwego parsowania
);

// Określ, który format użyć w zależności od środowiska
const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;

// Konfiguruj transporty (gdzie logować)
const transports = [
  // Zawsze loguj do konsoli
  new winston.transports.Console(),
];

// W production dodaj również logowanie do pliku errors.log
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'errors.log'),
      level: 'error', // Loguj tylko błędy do tego pliku
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  // Możesz dodać też transport dla wszystkich logów
  // transports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
}

// Utwórz i eksportuj instancję loggera
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Poziom logowania (np. 'debug', 'error')
  format: format,
  transports: transports,
});

module.exports = logger;