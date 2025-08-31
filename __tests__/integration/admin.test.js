const request = require('supertest');
const mongoose = require('mongoose');
const { app, startServer, cleanupTestDatabase } = require('../../server');
const PendingUser = require('../../models/PendingUser');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Integracja: Endpointy Administracyjne', () => {
  let adminAuthToken;
  let userAuthToken;
  let _adminUser;
  let _regularUser;
  let pendingUser1;
  let pendingUser2;

  beforeAll(async () => {
    await startServer();

    // Utwórz administratora
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    _adminUser = await User.create({
      email: 'admin@example.com',
      password: hashedAdminPassword,
      username: 'adminuser',
      role: 'admin',
    });

    // Utwórz zwykłego użytkownika
    const hashedUserPassword = await bcrypt.hash('user123', 10);
    _regularUser = await User.create({
      email: 'regular@example.com',
      password: hashedUserPassword,
      username: 'regularuser',
      role: 'user',
    });

    // Utwórz użytkowników oczekujących
    pendingUser1 = await PendingUser.create({
      username: 'pendinguser1',
      email: 'pending1@example.com',
      password: 'pendingpass1',
      role: 'user',
    });

    pendingUser2 = await PendingUser.create({
      username: 'pendinguser2',
      email: 'pending2@example.com',
      password: 'pendingpass2',
      role: 'author',
    });

    // Login jako admin aby dostać token
    const adminLoginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
    });
    adminAuthToken = adminLoginResponse.headers['set-cookie'][0];

    // Login jako zwykły użytkownik
    const userLoginResponse = await request(app).post('/api/auth/login').send({
      email: 'regular@example.com',
      password: 'user123',
    });
    userAuthToken = userLoginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await PendingUser.deleteMany({});
    await User.deleteMany({});
    await cleanupTestDatabase();
  });

  // 1. GET /api/admin/pending-users
  describe('GET /api/admin/pending-users', () => {
    it('Powinien zwrócić listę użytkowników oczekujących dla administratora', async () => {
      const response = await request(app)
        .get('/api/admin/pending-users')
        .set('Cookie', adminAuthToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBe(2);
      expect(response.body).toHaveProperty('total', 2);
    });

    it('Powinien zwrócić błąd 403 dla zwykłego użytkownika', async () => {
      const response = await request(app)
        .get('/api/admin/pending-users')
        .set('Cookie', userAuthToken);

      expect(response.status).toBe(403);
    });

    it('Powinien zwrócić błąd 401 gdy brak autoryzacji', async () => {
      const response = await request(app).get('/api/admin/pending-users');

      expect(response.status).toBe(401);
    });
  });

  // 2. POST /api/admin/approve/:id
  describe('POST /api/admin/approve/:id', () => {
    it('Powinien zatwierdzić użytkownika oczekującego', async () => {
      const response = await request(app)
        .post(`/api/admin/approve/${pendingUser1._id}`)
        .set('Cookie', adminAuthToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Użytkownik zatwierdzony i dodany do systemu.',
      );
      expect(response.body).toHaveProperty('userId');

      // Sprawdź czy użytkownik został przeniesiony do kolekcji User
      const approvedUser = await User.findOne({
        email: 'pending1@example.com',
      });
      expect(approvedUser).not.toBeNull();
      expect(approvedUser.username).toBe('pendinguser1');

      // Sprawdź czy użytkownik został usunięty z kolekcji PendingUser
      const pendingUser = await PendingUser.findById(pendingUser1._id);
      expect(pendingUser).toBeNull();
    });

    it('Powinien zwrócić błąd 404 dla nieistniejącego użytkownika oczekującego', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/admin/approve/${fakeId}`)
        .set('Cookie', adminAuthToken);

      expect(response.status).toBe(404);
    });

    it('Powinien zwrócić błąd 403 dla zwykłego użytkownika', async () => {
      const response = await request(app)
        .post(`/api/admin/approve/${pendingUser2._id}`)
        .set('Cookie', userAuthToken);

      expect(response.status).toBe(403);
    });
  });

  // 3. DELETE /api/admin/reject/:id
  describe('DELETE /api/admin/reject/:id', () => {
    it('Powinien odrzucić użytkownika oczekującego', async () => {
      const response = await request(app)
        .delete(`/api/admin/reject/${pendingUser2._id}`)
        .set('Cookie', adminAuthToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Wniosek został odrzucony.',
      );

      // Sprawdź czy użytkownik został usunięty z kolekcji PendingUser
      const rejectedUser = await PendingUser.findById(pendingUser2._id);
      expect(rejectedUser).toBeNull();

      // Sprawdź czy użytkownik NIE został dodany do kolekcji User
      const userInSystem = await User.findOne({
        email: 'pending2@example.com',
      });
      expect(userInSystem).toBeNull();
    });

    it('Powinien zwrócić błąd 404 dla nieistniejącego użytkownika oczekującego', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/admin/reject/${fakeId}`)
        .set('Cookie', adminAuthToken);

      expect(response.status).toBe(404);
    });

    it('Powinien zwrócić błąd 403 dla zwykłego użytkownika', async () => {
      // Utwórz kolejnego użytkownika oczekującego do testu
      const testPendingUser = await PendingUser.create({
        username: 'testreject',
        email: 'testreject@example.com',
        password: 'testpass',
        role: 'user',
      });

      const response = await request(app)
        .delete(`/api/admin/reject/${testPendingUser._id}`)
        .set('Cookie', userAuthToken);

      expect(response.status).toBe(403);

      // Posprzątaj
      await PendingUser.findByIdAndDelete(testPendingUser._id);
    });
  });
});
