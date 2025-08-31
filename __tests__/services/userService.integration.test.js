// __tests__/services/userService.integration.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const userService = require('../../services/userService');

let mongoServer;

// ✅ Zwiększ timeout dla wszystkich testów
jest.setTimeout(30000);

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Memory Server:', uri);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
});

afterEach(async () => {
  try {
    await User.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up users:', error);
  }
});

afterAll(async () => {
  try {
    // ✅ Bezpieczne zamykanie połączenia
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    // ✅ Bezpieczne zatrzymanie memory server
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
});

describe('Serwis: userService - testy integracyjne', () => {
  it('Powinien stworzyć i pobrać użytkownika bez hasła', async () => {
    const user = await User.create({
      email: 'test@test.com',
      password: 'hashedPassword',
      username: 'Tester',
      role: 'user',
    });

    const profile = await userService.getProfile(user._id);

    expect(profile).toMatchObject({
      email: 'test@test.com',
      username: 'Tester',
      role: 'user',
    });
    expect(profile.password).toBeUndefined();
  });

  it('Powinien zaktualizować nazwę użytkownika', async () => {
    const user = await User.create({
      email: 'abc@test.com',
      password: 'hashedPassword',
      username: 'OldName',
      role: 'user',
    });

    const updated = await userService.updateProfile(user._id, {
      username: 'NewName',
    });

    expect(updated.username).toBe('NewName');
    expect(updated.password).toBeUndefined();
  });

  it('Powinien rzucić błąd gdy użytkownik nie istnieje', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(userService.getProfile(fakeId)).rejects.toThrow(
      'Użytkownik nie istnieje',
    );
  });

  it('Powinien zmienić hasło gdy stare hasło jest poprawne', async () => {
    const hashed = await bcrypt.hash('oldPass', 10);
    const user = await User.create({
      email: 'pass@test.com',
      password: hashed,
      username: 'PassUser',
      role: 'user',
    });

    await userService.changePassword(user._id, 'oldPass', 'newPass');
    const updated = await User.findById(user._id);

    const isMatch = await bcrypt.compare('newPass', updated.password);
    expect(isMatch).toBe(true);
  });

  it('Powinien rzucić błąd gdy stare hasło jest nieprawidłowe', async () => {
    const hashed = await bcrypt.hash('oldPass', 10);
    const user = await User.create({
      email: 'failpass@test.com',
      password: hashed,
      username: 'FailUser',
      role: 'user',
    });

    await expect(
      userService.changePassword(user._id, 'wrongPass', 'newPass'),
    ).rejects.toThrow('Stare hasło jest nieprawidłowe.');
  });

  it('Powinien zwrócić listę użytkowników bez haseł', async () => {
    await User.create([
      {
        email: 'user1@test.com',
        password: 'hashedPassword1', // min 6 znaków
        username: 'User1',
        role: 'user',
      },
      {
        email: 'user2@test.com',
        password: 'hashedPassword2', // min 6 znaków
        username: 'User2',
        role: 'user',
      },
    ]);

    const users = await userService.listUsers();

    expect(users).toHaveLength(2);
    users.forEach((u) => expect(u.password).toBeUndefined());
  });

  it('Powinien zmienić rolę użytkownika na admin', async () => {
    const user = await User.create({
      email: 'role@test.com',
      password: 'hashed',
      username: 'RoleUser',
      role: 'user',
    });

    const updated = await userService.changeRole(user._id, 'admin');

    expect(updated.role).toBe('admin');
    expect(updated.password).toBeUndefined();
  });

  it('Powinien rzucić błąd dla nieprawidłowej roli', async () => {
    const user = await User.create({
      email: 'badrole@test.com',
      password: 'hashed',
      username: 'BadRole',
      role: 'user',
    });

    await expect(
      userService.changeRole(user._id, 'superadmin'),
    ).rejects.toThrow('Nieprawidłowa rola.');
  });

  it('Powinien usunąć użytkownika', async () => {
    const user = await User.create({
      email: 'del@test.com',
      password: 'hashed',
      username: 'DeleteMe',
      role: 'user',
    });

    await userService.deleteUser(user._id);

    const found = await User.findById(user._id);
    expect(found).toBeNull();
  });
});
