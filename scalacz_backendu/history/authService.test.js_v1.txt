// __tests__/services/authService.test.js
const authService = require('../../services/authService');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

jest.mock('../../models/User');
jest.mock('bcryptjs');

describe('Serwis: authService - funkcja login', () => {
  const mockEmail = 'test@example.com';
  const mockPassword = 'haslo123';
  const mockWrongPassword = 'zlehaslo';
  const mockUserId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Powinien rzucić błąd "Nieprawidłowy email lub hasło" jeśli użytkownik nie istnieje', async () => {
    User.findOne.mockResolvedValue(null);
    
    await expect(authService.login(mockEmail, mockPassword))
      .rejects
      .toThrow('Nieprawidłowy email lub hasło.');
    
    expect(User.findOne).toHaveBeenCalledWith({ email: mockEmail.toLowerCase() });
  });

  it('Powinien rzucić błąd "Nieprawidłowy email lub hasło" jeśli hasło jest niepoprawne', async () => {
    const mockUser = {
      _id: mockUserId,
      email: mockEmail,
      password: 'zahashowane_haslo_z_bazy',
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.login(mockEmail, mockWrongPassword))
      .rejects
      .toThrow('Nieprawidłowy email lub hasło.');

    expect(bcrypt.compare).toHaveBeenCalledWith(mockWrongPassword, mockUser.password);
  });

  it('Powinien zwrócić token JWT gdy email i hasło są poprawne', async () => {
    const mockUser = {
      _id: mockUserId,
      email: mockEmail,
      password: 'zahashowane_haslo_z_bazy',
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login(mockEmail, mockPassword);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(20);
    expect(User.findOne).toHaveBeenCalledWith({ email: mockEmail.toLowerCase() });
    expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockUser.password);
  });

  // Dodatkowe testy dla przypadków brzegowych
  it('Powinien rzucić błąd gdy email jest pusty', async () => {
    await expect(authService.login('', mockPassword))
      .rejects
      .toThrow('Email jest wymagany.');
  });

  it('Powinien rzucić błąd gdy hasło jest puste', async () => {
    await expect(authService.login(mockEmail, ''))
      .rejects
      .toThrow('Hasło jest wymagane.');
  });
});