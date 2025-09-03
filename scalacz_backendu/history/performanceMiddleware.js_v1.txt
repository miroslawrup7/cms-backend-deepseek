// middleware/performanceMiddleware.js
const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`⏱️ ${req.method} ${req.url} - ${duration}ms`);
    
    if (duration > 100) {
      console.warn(`🚨 WOLNE ZAPYTANIE: ${req.url} - ${duration}ms`);
    }
  });
  
  next();
};

module.exports = performanceMiddleware;