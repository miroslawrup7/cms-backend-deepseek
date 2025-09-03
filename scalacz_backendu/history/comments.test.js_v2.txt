const request = require('supertest');
const mongoose = require('mongoose');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const Article = require('../../models/Article');
const Comment = require('../../models/Comment');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Integracja: Endpointy Komentarzy', () => {
  let authToken;
  let testUser;
  let testArticle;
  let testComment;

  beforeAll(async () => {
    await startServer();

    // Utwórz testowego użytkownika i zaloguj
    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await User.create({
      email: 'commenter@example.com',
      password: hashedPassword,
      username: 'commenter',
      role: 'user',
    });

    // Login aby dostać token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'commenter@example.com',
      password: 'test123',
    });

    authToken = loginResponse.headers['set-cookie'][0];
  });

  beforeEach(async () => {
    // Utwórz testowy artykuł przed każdym testem
    testArticle = await Article.create({
      title: 'Test Article for Comments',
      content:
        'Content for comments test. This should be long enough for validation.',
      author: testUser._id,
      images: [],
    });

    // Utwórz testowy komentarz
    testComment = await Comment.create({
      text: 'Initial test comment for testing purposes',
      article: testArticle._id,
      author: testUser._id,
    });
  });

  afterEach(async () => {
    await Comment.deleteMany({});
    await Article.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await cleanupTestDatabase();
  });

  // 1. GET /api/comments/:id (articleId)
  describe('GET /api/comments/:id', () => {
    it('Powinien zwrócić listę komentarzy dla artykułu', async () => {
      const response = await request(app)
        .get(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty(
        'text',
        'Initial test comment for testing purposes',
      );
    });

    it('Powinien zwrócić pustą listę gdy brak komentarzy', async () => {
      await Comment.deleteMany({});

      const response = await request(app)
        .get(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('Powinien zwrócić pustą listę dla nieistniejącego artykułu', async () => {
      const fakeArticleId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/comments/${fakeArticleId}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0); // Pusta tablica zamiast błędu 404
    });
  });

  // 2. POST /api/comments/:id (articleId)
  describe('POST /api/comments/:id', () => {
    it('Powinien dodać komentarz do artykułu', async () => {
      const newComment = {
        text: 'This is a new test comment with sufficient length',
      };

      const response = await request(app)
        .post(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken)
        .send(newComment);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('text', newComment.text);
      expect(response.body).toHaveProperty(
        'article',
        testArticle._id.toString(),
      );
      expect(response.body).toHaveProperty('author');

      // Sprawdź czy komentarz jest w bazie
      const comments = await Comment.find({ article: testArticle._id });
      expect(comments).toHaveLength(2);
    });

    it('Powinien zwrócić błąd 400 dla zbyt krótkiego komentarza', async () => {
      const shortComment = {
        text: 'Short', // 5 znaków < 6 wymaganych
      };

      const response = await request(app)
        .post(`/api/comments/${testArticle._id}`)
        .set('Cookie', authToken)
        .send(shortComment);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('Powinien zwrócić błąd 404 dla nieistniejącego artykułu', async () => {
      const fakeArticleId = new mongoose.Types.ObjectId();
      const newComment = {
        text: 'Comment for non-existent article',
      };

      const response = await request(app)
        .post(`/api/comments/${fakeArticleId}`)
        .set('Cookie', authToken)
        .send(newComment);

      expect(response.status).toBe(404);
    });
  });

  // 3. PUT /api/comments/:id (commentId)
  describe('PUT /api/comments/:id', () => {
    it('Powinien zaktualizować komentarz', async () => {
      const updatedText = 'This is an updated comment with sufficient length';

      const response = await request(app)
        .put(`/api/comments/${testComment._id}`)
        .set('Cookie', authToken)
        .send({ text: updatedText });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('text', updatedText);

      // Sprawdź czy komentarz został zaktualizowany w bazie
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.text).toBe(updatedText);
    });

    it('Powinien zwrócić błąd 403 przy próbie edycji cudzego komentarza', async () => {
      // Utwórz innego użytkownika
      const otherUser = await User.create({
        email: 'other@example.com',
        password: await bcrypt.hash('test123', 10),
        username: 'otheruser',
        role: 'user',
      });

      // Utwórz komentarz jako inny użytkownik
      const otherComment = await Comment.create({
        text: 'Other user comment',
        article: testArticle._id,
        author: otherUser._id,
      });

      const response = await request(app)
        .put(`/api/comments/${otherComment._id}`)
        .set('Cookie', authToken)
        .send({ text: 'Trying to edit someone else comment' });

      expect(response.status).toBe(403);
    });

    it('Powinien zwrócić błąd 404 dla nieistniejącego komentarza', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/comments/${fakeCommentId}`)
        .set('Cookie', authToken)
        .send({ text: 'Trying to update non-existent comment' });

      expect(response.status).toBe(404);
    });
  });

  // 4. DELETE /api/comments/:id (commentId)
  describe('DELETE /api/comments/:id', () => {
    it('Powinien usunąć komentarz', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testComment._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(204);

      // Sprawdź czy komentarz został usunięty z bazy
      const deletedComment = await Comment.findById(testComment._id);
      expect(deletedComment).toBeNull();
    });

    it('Powinien zwrócić błąd 403 przy próbie usunięcia cudzego komentarza', async () => {
      // Utwórz innego użytkownika
      const otherUser = await User.create({
        email: 'other2@example.com',
        password: await bcrypt.hash('test123', 10),
        username: 'otheruser2',
        role: 'user',
      });

      // Utwórz komentarz jako inny użytkownik
      const otherComment = await Comment.create({
        text: 'Other user comment to delete',
        article: testArticle._id,
        author: otherUser._id,
      });

      const response = await request(app)
        .delete(`/api/comments/${otherComment._id}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(403);
    });

    it('Powinien zwrócić błąd 404 dla nieistniejącego komentarza', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/comments/${fakeCommentId}`)
        .set('Cookie', authToken);

      expect(response.status).toBe(404);
    });
  });
});
