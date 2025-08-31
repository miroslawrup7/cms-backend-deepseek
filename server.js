// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');

// 🎯 DODANE: Importy dla testów
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();
const app = express();

// Środowisko
const PORT = process.env.PORT || 5000;
let MONGO_URI = process.env.MONGO_URI;

// 🎯 DODANE: Zmienna dla memory server
let mongoServer;

// 🎯 DODANE: Funkcja inicjalizacji bazy testowej
const initializeTestDatabase = async () => {
  if (process.env.NODE_ENV === 'test') {
    mongoServer = await MongoMemoryServer.create();
    MONGO_URI = mongoServer.getUri();
    logger.info(`🧪 Test MongoDB URI: ${MONGO_URI}`);
  }
};

// 🎯 DODANE: Funkcja czyszczenia testowej bazy
const cleanupTestDatabase = async () => {
  if (process.env.NODE_ENV === 'test' && mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
    logger.info('🧪 Test MongoDB stopped');
  }
};

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

const ALLOWED_ORIGINS = ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Rate limit tylko dla /api/auth
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zbyt wiele żądań. Spróbuj ponownie później.' },
});
app.use('/api/auth', authLimiter);

// Statyczne pliki (obrazki)
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);

// Trasy API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/articles', require('./routes/articleRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 404 – brak trasy
app.use((req, res) => {
  res.status(404).json({ message: 'Nie znaleziono endpointu.' });
});

// Globalny error handler
app.use((err, req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Za duży plik. Limit 5MB.' });
  }
  if (
    err &&
    err.message &&
    /pliki graficzne|plik[ów]* graficzny|image/i.test(err.message)
  ) {
    return res
      .status(400)
      .json({ message: 'Dozwolone są tylko pliki graficzne.' });
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error('ERROR 💥:', err);
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error('ERROR 💥:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Coś poszło nie tak!',
    });
  }
});

// 🎯 ZMODYFIKOWANE: Funkcja startu serwera
const startServer = async () => {
  try {
    // Inicjalizuj testową bazę jeśli potrzeba
    await initializeTestDatabase();

    // Połączenie z MongoDB
    await mongoose.connect(MONGO_URI, {});
    logger.info('✅ Połączono z MongoDB');

    const conn = mongoose.connection;
    logger.info(`📦 Baza: ${conn.name}`);
    logger.info(`🌐 Host: ${conn.host}`);

    // Uruchom serwer tylko jeśli nie jesteśmy w testach
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => logger.info(`🚀 Serwer działa na porcie ${PORT}`));
    }
  } catch (err) {
    logger.error('❌ Błąd uruchamiania serwera:', err);

    // Sprzątanie testowej bazy w przypadku błędu
    await cleanupTestDatabase();
    process.exit(1);
  }
};

// 🎯 DODANE: Eksport app dla testów Supertest
if (process.env.NODE_ENV === 'test') {
  module.exports = { app, startServer, cleanupTestDatabase };
} else {
  // Standardowe uruchomienie
  startServer();
}

// 🎯 DODANE: Obsługa graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Zamykanie serwera...');
  await cleanupTestDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Zamykanie serwera (SIGTERM)...');
  await cleanupTestDatabase();
  process.exit(0);
});
