// __tests__/integration/csp.test.js
const request = require('supertest');
const { app, startServer, cleanupTestDatabase } = require('../../server');

describe('Integracja: Content Security Policy', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('Powinien zwracać nagłówki Content-Security-Policy', async () => {
    const response = await request(app).get('/api/articles');

    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('content-security-policy');
    
    const cspHeader = response.headers['content-security-policy'];
    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("default-src 'self'");
  });

  it('Powinien pozwalać na obrazy z data URI', async () => {
    const response = await request(app).get('/api/articles');
    
    const cspHeader = response.headers['content-security-policy'];
    expect(cspHeader).toContain("img-src 'self' data:");
  });

  it('Powinien blokować obiekty embedded', async () => {
    const response = await request(app).get('/api/articles');
    
    const cspHeader = response.headers['content-security-policy'];
    expect(cspHeader).toContain("object-src 'none'");
  });
});