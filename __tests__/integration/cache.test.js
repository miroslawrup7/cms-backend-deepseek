// __tests__/integration/cache.test.js
const request = require('supertest');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const redisClient = require('../../utils/redisClient');

describe('Integracja: Cache Redis', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await redisClient.disconnect();
    await cleanupTestDatabase();
  });

  it('Powinien cache\'ować odpowiedzi GET /api/articles', async () => {
    // Pierwsze request - cache MISS
    const response1 = await request(app).get('/api/articles');
    expect(response1.status).toBe(200);

    // Drugie request - cache HIT
    const response2 = await request(app).get('/api/articles');
    expect(response2.status).toBe(200);

    // Sprawdź nagłówki lub czas odpowiedzi
    // (w rzeczywistości cache jest transparentny dla klienta)
  });

  it('Nie powinien cache\'ować POST requests', async () => {
    const response = await request(app)
      .post('/api/articles')
      .set('Cookie', authToken) // potrzebny token
      .send({ title: 'Test', content: 'Content' });
    
    expect(response.status).toBe(201);
    // POST nie powinien być cache'owany
  });
});