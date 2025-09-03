// __tests__/integration/auth.test.js
const request = require('supertest');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const User = require('../../models/User');
const PendingUser = require('../../models/PendingUser');
const bcrypt = require('bcryptjs');

describe('Integracja: Endpointy Autentykacji', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterEach(async () => {
    // Czyść wszystkie kolekcje po każdym teście
    await User.deleteMany({});
    await PendingUser.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('Powinien zalogować użytkownika i zwrócić cookie z tokenem', async () => {
      // 1. Utwórz aktywnego użytkownika
      const hashedPassword = await bcrypt.hash('test123', 10);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        username: 'testuser',
        role: 'user',
      });

      // 2. Wyślij request login
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'test123',
      });

      // 3. Sprawdź response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Zalogowano pomyślnie.' });

      // 4. Sprawdź czy token jest w cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes('token'))).toBe(true);
    });

    it('Powinien zwrócić błąd 400 dla nieprawidłowych danych', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Nieprawidłowy email lub hasło.',
      });
    });

    it('Powinien zwrócić błąd 400 dla brakującego emaila', async () => {
      const response = await request(app).post('/api/auth/login').send({
        password: 'test123',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/register-pending', () => {
    it('Powinien zarejestrować użytkownika oczekującego', async () => {
      const response = await request(app)
        .post('/api/auth/register-pending')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          role: 'user',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Wniosek o rejestrację został przesłany.',
      });

      // Sprawdź czy użytkownik jest w kolekcji pending
      const pendingUser = await PendingUser.findOne({
        email: 'new@example.com',
      });
      expect(pendingUser).not.toBeNull();
      expect(pendingUser.username).toBe('newuser');
    });

    it('Powinien zwrócić błąd 400 dla zajętego emaila', async () => {
      // Najpierw utwórz użytkownika
      await PendingUser.create({
        username: 'existing',
        email: 'existing@example.com',
        password: 'password123',
        role: 'user',
      });

      const response = await request(app)
        .post('/api/auth/register-pending')
        .send({
          username: 'newuser',
          email: 'existing@example.com', // Ten sam email
          password: 'password123',
          role: 'user',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Email jest już zajęty.' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('Powinien wylogować użytkownika i wyczyścić cookie', async () => {
      const response = await request(app).post('/api/auth/logout').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Wylogowano.' });

      // Sprawdź czy cookie jest czyszczone
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes('token=;'))).toBe(true);
    });
  });
});
