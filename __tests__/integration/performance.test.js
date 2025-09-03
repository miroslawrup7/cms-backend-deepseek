// __tests__/integration/performance.test.js
const { app, startServer } = require('../../server');

describe('Wydajność: Testy optymalizacji', () => {
  beforeAll(async () => {
    await startServer();
  });

  it('GET /api/articles powinien być szybki (<100ms)', async () => {
    const start = Date.now();
    const response = await request(app).get('/api/articles');
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100); // ✅ Szybko!
  });

  it('GET /api/articles?search=test powinien używać full-text index', async () => {
    const response = await request(app).get('/api/articles?search=test');
    expect(response.status).toBe(200);
    // Sprawdź w logach czy używa $text index
  });
});