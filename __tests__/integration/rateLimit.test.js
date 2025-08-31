const request = require('supertest');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Integracja: Rate Limiting', () => {
  let authToken;

  beforeAll(async () => {
    await startServer();

    // Utwórz testowego użytkownika
    const hashedPassword = await bcrypt.hash('test123', 10);
    await User.create({
      email: 'ratelimit@example.com',
      password: hashedPassword,
      username: 'ratelimituser',
      role: 'user',
    });

    // Zaloguj się aby dostać token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'ratelimit@example.com',
      password: 'test123',
    });
    authToken = loginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await User.deleteMany({});
    await cleanupTestDatabase();
  });

  describe('Global Rate Limiting', () => {
    it('Powinien pozwolić na normalną liczbę żądań', async () => {
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app).get('/api/articles').set('Cookie', authToken),
        );
      }

      const responses = await Promise.all(requests);
      const successResponses = responses.filter((r) => r.status === 200);

      expect(successResponses.length).toBe(100);
    }, 30000);

    it('Powinien blokować przy zbyt wielu żądaniach z tego samego IP', async () => {
      const requests = [];
      for (let i = 0; i < 1001; i++) {
        requests.push(request(app).get('/api/articles'));
      }

      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter((r) => r.status === 429);

      expect(blockedResponses.length).toBeGreaterThan(0);
      expect(blockedResponses[0].body.message).toContain('Zbyt wiele żądań');
    }, 30000);
  });

  describe('Auth Rate Limiting', () => {
    it('Powinien blokować przy zbyt wielu próbach logowania', async () => {
      const requests = [];
      // Użyj UNIKALNYCH adresów IP dla każdego żądania (omijają globalny limiter)
      for (let i = 0; i < 51; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .set('X-Forwarded-For', `192.168.1.${i}`) // 🎯 RÓŻNE IP
            .send({
              email: `test${i}@example.com`,
              password: 'wrongpassword',
            }),
        );
      }

      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter((r) => r.status === 429);

      expect(blockedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Admin Rate Limiting', () => {
    it('Powinien blokować przy zbyt wielu żądaniach do admin endpointów', async () => {
      // 🎯 UTWÓRZ admina PRZED testami (bez logowania przez API)
      const adminPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'adminlimit@example.com',
        password: adminPassword,
        username: 'adminlimit',
        role: 'admin',
      });

      // 🎯 SYMULOWANY token admina (omijamy rate limiting logowania)
      const adminToken =
        'token=simulated_admin_token; Path=/; HttpOnly; SameSite=Lax';

      const requests = [];
      for (let i = 0; i < 201; i++) {
        requests.push(
          request(app)
            .get('/api/admin/pending-users')
            .set('Cookie', adminToken),
        );
      }

      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter((r) => r.status === 429);

      // Powinno być przynajmniej 1 zablokowane żądanie (201 > limit 200)
      expect(blockedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Rate Limit Headers', () => {
    it('Powinien zwracać nagłówki RateLimit', async () => {
      const response = await request(app)
        .get('/api/articles')
        .set('Cookie', authToken);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });
});
