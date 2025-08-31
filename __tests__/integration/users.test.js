const request = require('supertest');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Integracja: Endpointy Użytkowników', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await startServer();

    // Utwórz testowego użytkownika i zaloguj
    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await User.create({
      email: 'testuser@example.com',
      password: hashedPassword,
      username: 'testuser',
      role: 'user',
    });

    // Login aby dostać token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'testuser@example.com',
      password: 'test123',
    });

    authToken = loginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await User.deleteMany({});
    await cleanupTestDatabase();
  });

  // 1. GET /api/users/profile
  describe('GET /api/users/profile', () => {
    it('Powinien zwrócić profil zalogowanego użytkownika', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', testUser._id.toString());
      expect(response.body).toHaveProperty('email', 'testuser@example.com');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('role', 'user');
      expect(response.body).not.toHaveProperty('password'); // Hasło nie powinno być zwracane
    });

    it('Powinien zwrócić błąd 401 gdy brak autoryzacji', async () => {
      const response = await request(app).get('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  // 2. PUT /api/users/profile
  describe('PUT /api/users/profile', () => {
    it('Powinien zaktualizować nazwę użytkownika', async () => {
      const updatedData = {
        username: 'updatedusername',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Cookie', authToken)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Profil zaktualizowany');
      expect(response.body.user).toHaveProperty('username', 'updatedusername');
      expect(response.body.user).toHaveProperty(
        'email',
        'testuser@example.com',
      ); // Email nie powinien się zmienić

      // Sprawdź czy dane zostały zaktualizowane w bazie
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.username).toBe('updatedusername');
    });

    it('Powinien zwrócić błąd 400 dla zbyt krótkiej nazwy użytkownika', async () => {
      const invalidData = {
        username: 'ab', // 2 znaki < 3 wymagane
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Cookie', authToken)
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('Powinien zwrócić błąd 401 gdy brak autoryzacji', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ username: 'test' });

      expect(response.status).toBe(401);
    });
  });

  // 3. PUT /api/users/password
  describe('PUT /api/users/password', () => {
    it('Powinien zmienić hasło użytkownika', async () => {
      const passwordData = {
        oldPassword: 'test123',
        newPassword: 'newpassword123',
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Cookie', authToken)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Hasło zostało zmienione.',
      );

      // Sprawdź czy można zalogować się nowym hasłem
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'testuser@example.com',
        password: 'newpassword123',
      });

      expect(loginResponse.status).toBe(200);
    });

    it('Powinien zwrócić błąd 400 dla nieprawidłowego starego hasła', async () => {
      const passwordData = {
        oldPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Cookie', authToken)
        .send(passwordData);

      expect(response.status).toBe(400);
    });

    it('Powinien zwrócić błąd 400 dla zbyt krótkiego nowego hasła', async () => {
      const passwordData = {
        oldPassword: 'test123',
        newPassword: 'short', // 5 znaków < 6 wymagane
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Cookie', authToken)
        .send(passwordData);

      expect(response.status).toBe(400);
    });

    it('Powinien zwrócić błąd 401 gdy brak autoryzacji', async () => {
      const response = await request(app).put('/api/users/password').send({
        oldPassword: 'test123',
        newPassword: 'newpassword123',
      });

      expect(response.status).toBe(401);
    });
  });

  // Testy dla admin endpoints (będą w admin.test.js)
  describe('Endpointy administracyjne (będą testowane osobno)', () => {
    it('Tymczasowy test - do usunięcia', () => {
      expect(true).toBe(true);
    });
  });
});
