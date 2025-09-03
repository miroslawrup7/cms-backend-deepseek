const { sanitizeStrict } = require('../utils/sanitize');

const deepSanitize = (req, res, next) => {
  // Tylko dla bardzo podstawowej ochrony - NIE escapuj, tylko usuń najbardziej niebezpieczne
  const quickSanitize = (text) => {
    if (typeof text !== 'string') return text;

    // Usuń tylko najbardziej niebezpieczne rzeczy, ale nie escapuj całego HTML
    return text
      .replace(/javascript:/gi, '') // Usuń javascript:
      .replace(/on\w+=/gi, '') // Usuń atrybuty zdarzeń
      .substring(0, 1000); // Limit długości
  };

  // Sanityzacja parametrów URL
  if (req.params) {
    Object.keys(req.params).forEach((key) => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = quickSanitize(req.params[key]);
      }
    });
  }

  // Sanityzacja query string
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = quickSanitize(req.query[key]);
      }
    });
  }

  // Sanityzacja body (dla JSON) - TUTAJ BARDZIEJ OSTROŻNIE
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'string') {
          // Dla username, email - użyj strict sanitization
          if (['username', 'email', 'password'].includes(key)) {
            obj[key] = sanitizeStrict(obj[key]);
          } else {
            // Dla innych pól - tylko podstawowe czyszczenie
            obj[key] = quickSanitize(obj[key]);
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    sanitizeObject(req.body);
  }

  next();
};

module.exports = deepSanitize;
