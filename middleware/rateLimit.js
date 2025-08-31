const rateLimit = require('express-rate-limit');

// Podstawowy rate limiting dla wszystkich endpointów
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 1000, // maksymalnie 1000 żądań na IP w przedziale czasowym
  message: {
    status: 'error',
    message: 'Zbyt wiele żądań z tego adresu IP. Spróbuj ponownie za 15 minut.',
  },
  standardHeaders: true, // Zwraca nagłówki RateLimit-*
  legacyHeaders: false, // Wyłącza nagłówki X-RateLimit-*
});

// Zaostrzony limiting dla endpointów autentykacji
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 50, // tylko 50 prób logowania/rejestracji na IP
  message: {
    status: 'error',
    message: 'Zbyt wiele prób autentykacji. Spróbuj ponownie za 15 minut.',
  },
  skip: (req) =>
    // Pomijaj limity dla udanych logowań (chroni przed blokowaniem prawdziwych użytkowników)
    req.path.includes('/login') && req.method === 'POST' && req.user,
});

// Bardzo restrykcyjny limiting dla admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 200, // 200 żądań na IP dla endpointów admina
  message: {
    status: 'error',
    message: 'Zbyt wiele żądań do panelu administracyjnego.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  adminLimiter,
};
