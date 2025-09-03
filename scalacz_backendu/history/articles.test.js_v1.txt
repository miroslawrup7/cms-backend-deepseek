// __tests__/integration/articles.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const Article = require('../../models/Article');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Integracja: Endpointy Artykułów', () => {
  let authToken;
  let testUser;
  let testArticle;

  beforeAll(async () => {
    await startServer();

    // Utwórz testowego użytkownika i zaloguj
    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await User.create({
      email: 'author@example.com',
      password: hashedPassword,
      username: 'author',
      role: 'author',
    });

    // Login aby dostać token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'author@example.com',
      password: 'test123',
    });

    authToken = loginResponse.headers['set-cookie'][0];
  });

  afterEach(async () => {
    await Article.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await cleanupTestDatabase();
  });

  // ✅ TEST 1: GET /api/articles - lista z paginacją
  describe('GET /api/articles', () => {
    it('Powinien zwrócić listę artykułów z paginacją', async () => {
      // Utwórz testowe artykuły
      await Article.create([
        {
          title: 'Test Article 1',
          content: 'Content of article 1',
          author: testUser._id,
          images: [],
        },
        {
          title: 'Test Article 2',
          content: 'Content of article 2',
          author: testUser._id,
          images: [],
        },
      ]);

      const response = await request(app)
        .get('/api/articles?page=1&limit=2')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('articles');
      expect(response.body).toHaveProperty('total');
      expect(response.body.articles).toHaveLength(2);
    });
  });

  // ✅ TEST 2: POST /api/articles - tworzenie artykułu
  describe('POST /api/articles', () => {
    it('Powinien utworzyć nowy artykuł', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Cookie', authToken)
        .field('title', 'New Test Article')
        .field('content', 'This is the content of the new article')
        .attach('images', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Artykuł utworzony');
      expect(response.body).toHaveProperty('article');
    });
  });

  // ✅ TEST 3: GET /api/articles/:id - pojedynczy artykuł
  describe('GET /api/articles/:id', () => {
    it('Powinien zwrócić pojedynczy artykuł', async () => {
      const article = await Article.create({
        title: 'Single Article',
        content: 'Content for single article',
        author: testUser._id,
        images: [],
      });

      const response = await request(app)
        .get(`/api/articles/${article._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Single Article');
    });
  });

  // ✅ TEST 4: PUT /api/articles/:id - edycja artykułu
  describe('PUT /api/articles/:id', () => {
    it('Powinien zaktualizować artykuł', async () => {
      const article = await Article.create({
        title: 'Old Title',
        content: 'Old content',
        author: testUser._id,
        images: [],
      });

      const response = await request(app)
        .put(`/api/articles/${article._id}`)
        .set('Cookie', authToken)
        .send({
          title: 'Updated Title',
          content: 'Updated content',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Artykuł zaktualizowany');
    });
  });

  // ✅ TEST 5: DELETE /api/articles/:id - usuwanie artykułu
  describe('DELETE /api/articles/:id', () => {
    it('Powinien usunąć artykuł', async () => {
      const article = await Article.create({
        title: 'Article to delete',
        content: 'Content to delete',
        author: testUser._id,
        images: [],
      });

      const response = await request(app)
        .delete(`/api/articles/${article._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(204);
    });
  });

  // ✅ TEST 6: POST /api/articles/:id/like - like/dislike
  describe('POST /api/articles/:id/like', () => {
    it('Powinien dodać like do artykułu', async () => {
      const article = await Article.create({
        title: 'Article to like',
        content: 'Content to like',
        author: new mongoose.Types.ObjectId(), // Inny autor
        images: [],
      });

      const response = await request(app)
        .post(`/api/articles/${article._id}/like`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('liked', true);
    });
  });
});
