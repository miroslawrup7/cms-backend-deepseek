// middleware/cacheMiddleware.js
const redisClient = require('../utils/redisClient');

const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    // Cache tylko dla GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Klucz cache na podstawie URL i query params
    const key = `cache:${req.originalUrl}`;

    try {
      // Sprawdź czy mamy dane w cache
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log('Cache HIT:', key);
        return res.json(JSON.parse(cachedData));
      }

      console.log('Cache MISS:', key);

      // Zapisz oryginalną metodę res.json
      const originalJson = res.json.bind(res);

      // Nadpisz res.json aby cache'ować odpowiedź
      res.json = (body) => {
        // Cache'uj tylko successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.set(key, JSON.stringify(body), duration)
            .catch(err => console.error('Cache set error:', err));
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Specjalny middleware do invalidacji cache
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    // Po successful POST/PUT/DELETE, invaliduj cache
    const afterResponse = async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Dla uproszczenia - w production użyj redis.scan
          // Teraz po prostu logujemy że trzeba by invalidować
          console.log('Should invalidate cache for pattern:', pattern);
        }
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    };

    res.on('finish', afterResponse);
    next();
  };
};

module.exports = { cacheMiddleware, invalidateCache };