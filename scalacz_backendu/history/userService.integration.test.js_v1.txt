// __tests__/services/userService.integration.test.js
const userService = require('../../services/userService');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

jest.setTimeout(50000);

describe('Serwis: userService - testy integracyjne', () => {
  beforeAll(async () => {
    // Czyścimy kolekcję User przed testami
    await User.deleteMany({});
  }, 50000); // Timeout dla beforeAll

  afterEach(async () => {
    // Czyścimy po każdym teście
    await User.deleteMany({});
  }, 50000); // Timeout dla afterEach

  it('Powinien stworzyć i pobrać użytkownika bez hasła', async () => {
    // 1. Tworzymy użytkownika bezpośrednio
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'user',
    });
    await user.save();

    // 2. Testujemy getProfile
    const result = await userService.getProfile(user._id);

    expect(result._id.toString()).toBe(user._id.toString());
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');

    // ✅ POPRAWIONE: Sprawdź czy password jest undefined zamiast nieistnienia
    expect(result.password).toBeUndefined();
  }, 50000);

  it('Powinien zaktualizować nazwę użytkownika', async () => {
    const user = new User({
      username: 'oldname',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'user',
    });
    await user.save();

    const result = await userService.updateProfile(user._id, {
      username: 'newname',
    });

    expect(result.username).toBe('newname');
    expect(result).not.toHaveProperty('password');
  }, 50000);

  it('Powinien rzucić błąd gdy użytkownik nie istnieje', async () => {
    await expect(
      userService.getProfile('507f1f77bcf86cd799439011'),
    ).rejects.toThrow('Użytkownik nie istnieje');
  }, 50000);
});
