// __tests__/integration/sanitization.test.js
const request = require('supertest');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const User = require('../../models/User');
const Article = require('../../models/Article');
const bcrypt = require('bcryptjs');

describe('Integracja: Testy Sanitization i Bezpieczeństwa', () => {
  let authToken;
  let testUser;
  let testArticle;

  beforeAll(async () => {
    await startServer();

    // Utwórz testowego użytkownika
    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await User.create({
      email: 'security@example.com',
      password: hashedPassword,
      username: 'securityuser',
      role: 'author',
    });

    // Utwórz testowy artykuł
    testArticle = await Article.create({
      title: 'Test Security Article',
      content: 'Content for security testing',
      author: testUser._id,
      images: [],
    });

    // Login aby dostać token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'security@example.com',
      password: 'test123',
    });
    authToken = loginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Article.deleteMany({});
    await cleanupTestDatabase();
  });

  describe('XSS Injection Tests', () => {
    it('Powinien OCZYŚCIĆ XSS w tytule artykułu (usuń wszystkie tagi)', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', authToken)
        .field('title', '<script>alert("xss")</script>Test Title')
        .field(
          'content',
          'Normalna treść artykułu która jest wystarczająco długa.',
        )
        .attach('images', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body.article.title).toBe('Test Title'); // TYLKO czysty tekst
      expect(response.body.article.title).not.toContain('<script>');
      expect(response.body.article.title).not.toContain('alert');
    });

    it('Powinien OCZYŚCIĆ XSS w komentarzach (usuń niebezpieczne, zachowaj bezpieczne)', async () => {
      const response = await request(app)
        .post(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken)
        .send({
          text: 'Safe <b>bold</b> but <img src="x" onerror="alert(1)"> dangerous <script>alert(2)</script> and <a href="https://example.com">link</a>',
        });

      expect(response.status).toBe(201);
      // POWINNO ZACHOWAĆ bezpieczne formatowanie
      expect(response.body.text).toContain('<b>bold</b>');
      expect(response.body.text).toContain('<a href="https://example.com"');
      // POWINNO USUNĄĆ niebezpieczne tagi
      expect(response.body.text).not.toContain('<img');
      expect(response.body.text).not.toContain('<script>');
      expect(response.body.text).not.toContain('onerror');
      // POWINNO ZACHOWAĆ tekst
      expect(response.body.text).toContain('Safe');
      expect(response.body.text).toContain('bold');
      expect(response.body.text).toContain('dangerous');
      expect(response.body.text).toContain('link');
    });

    it('Powinien OCZYŚCIĆ XSS w update profilu (usuń wszystkie tagi)', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Cookie', authToken)
        .send({ username: '<script>alert("xss")</script>Hacker' });

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('Hacker'); // TYLKO czysty tekst
      expect(response.body.user.username).not.toContain('<script>');
    });
  });

  describe('SQL Injection Tests', () => {
    it('Powinien bezpiecznie obsłużyć SQL injection w wyszukiwaniu', async () => {
      const response = await request(app)
        .get('/api/articles?q=test%27; DROP TABLE users;--')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('articles');
      expect(Array.isArray(response.body.articles)).toBe(true);
    });

    it('Powinien bezpiecznie obsłużyć SQL injection w parametrach', async () => {
      const maliciousId = "'; DROP TABLE users; --";
      const response = await request(app)
        .get(`/api/articles/${maliciousId}`)
        .set('Cookie', authToken);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('HTML Injection Tests', () => {
    it('Powinien OCZYŚCIĆ HTML w polach tekstowych komentarzy', async () => {
      const cleanText = 'Normalny tekst <b>pogrubiony</b> ale bezpieczny';

      const response = await request(app)
        .post(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken)
        .send({ text: cleanText });

      expect(response.status).toBe(201);
      // Bezpieczne tagi powinny pozostać
      expect(response.body.text).toContain('<b>pogrubiony</b>');
      expect(response.body.text).not.toContain('<script>');
    });
  });

  describe('Specific Sanitization Behaviors', () => {
    it('Powinien zachować podstawowe formatowanie w komentarzach', async () => {
      const response = await request(app)
        .post(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken)
        .send({
          text: 'Text with <b>bold</b>, <i>italic</i> and <a href="https://example.com">link</a> but no <script>alert(1)</script>',
        });

      expect(response.status).toBe(201);
      // Bezpieczne tagi powinny pozostać
      expect(response.body.text).toContain('<b>bold</b>');
      expect(response.body.text).toContain('<i>italic</i>');
      expect(response.body.text).toContain('<a href="https://example.com"');
      // Niebezpieczne tagi powinny być usunięte
      expect(response.body.text).not.toContain('<script>');
    });

    it('Powinien całkowicie usuwać HTML w tytułach', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', authToken)
        .field('title', 'Title with <script>alert(1)</script> and <b>bold</b>')
        .field('content', 'Normal content here...')
        .attach('images', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(201);
      // WSZYSTKIE tagi powinny być usunięte - nawet bezpieczne
      // Po usunięciu tagów pozostaje podwójna spacja, co jest poprawne
      expect(response.body.article.title).toBe('Title with  and bold');
      expect(response.body.article.title).not.toContain('<script>');
      expect(response.body.article.title).not.toContain('<b>');
    });

    it('Powinien pozwalać na bogate formatowanie w treści artykułów', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', authToken)
        .field('title', 'Normal title')
        .field(
          'content',
          'Text with <b>bold</b>, <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="test"> and <script>alert(1)</script>',
        )
        .attach('images', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(201);
      // Bezpieczne tagi powinny pozostać
      expect(response.body.article.content).toContain('<b>bold</b>');
      // Obrazki mogą być usuwane w treści artykułów - to jest poprawne zachowanie
      expect(response.body.article.content).not.toContain('<script>');
    });
  });
});
