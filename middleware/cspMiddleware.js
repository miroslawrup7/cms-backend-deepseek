// middleware/cspMiddleware.js
const helmet = require('helmet');

const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Tymczasowo dla kompatybilności
      'https:',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Tymczasowo dla kompatybilności
      'https:',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    connectSrc: ["'self'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
  },
  reportOnly: process.env.NODE_ENV === 'development',
};

const cspMiddleware = helmet.contentSecurityPolicy(cspConfig);

module.exports = cspMiddleware;