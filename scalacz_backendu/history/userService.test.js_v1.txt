const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const userService = require('../../services/userService');

jest.mock('../../models/User');
jest.mock('bcryptjs');

describe('Serwis: userService', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'user',
    save: jest.fn().mockResolvedValue(true),
    deleteOne: jest.fn().mockResolvedValue(true),
    toObject: jest.fn(function () {
      const obj = { ...this };
      delete obj.password;
      return obj;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- getProfile ---
  describe('getProfile', () => {
    it('Powinien zwrócić profil użytkownika bez hasła', async () => {
      User.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ ...mockUser, password: undefined }),
      }));

      const result = await userService.getProfile(mockUser._id);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result.password).toBeUndefined();
      expect(result._id).toBe(mockUser._id);
    });

    it('Powinien rzucić błąd gdy użytkownik nie istnieje', async () => {
      User.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(null),
      }));

      await expect(userService.getProfile('nonexistent')).rejects.toThrow('Użytkownik nie istnieje');
    });
  });

  // --- updateProfile ---
  describe('updateProfile', () => {
    it('Powinien zaktualizować nazwę użytkownika', async () => {
      User.findById.mockResolvedValue({ ...mockUser });
      const result = await userService.updateProfile(mockUser._id, { username: 'newname' });
      expect(result.username).toBe('newname');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('Powinien rzucić błąd dla zbyt krótkiej nazwy użytkownika', async () => {
      await expect(userService.updateProfile(mockUser._id, { username: 'ab' }))
        .rejects.toThrow('Nazwa użytkownika musi mieć co najmniej 3 znaki.');
    });

    it('Powinien rzucić błąd gdy użytkownik nie istnieje', async () => {
      User.findById.mockResolvedValue(null);
      await expect(userService.updateProfile(mockUser._id, { username: 'newname' }))
        .rejects.toThrow('Użytkownik nie istnieje');
    });
  });

  // --- changePassword ---
  describe('changePassword', () => {
    it('Powinien zmienić hasło gdy stare hasło jest poprawne', async () => {
      User.findById.mockResolvedValue({ ...mockUser });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('newhashedpassword');

      await userService.changePassword(mockUser._id, 'oldPassword', 'newPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('Powinien rzucić błąd gdy stare hasło jest nieprawidłowe', async () => {
      User.findById.mockResolvedValue({ ...mockUser });
      bcrypt.compare.mockResolvedValue(false);

      await expect(userService.changePassword(mockUser._id, 'wrongOld', 'newPassword'))
        .rejects.toThrow('Stare hasło jest nieprawidłowe.');
    });

    it('Powinien rzucić błąd gdy nowe hasło jest za krótkie', async () => {
      await expect(userService.changePassword(mockUser._id, 'oldPassword', '123'))
        .rejects.toThrow('Nowe hasło musi mieć co najmniej 6 znaków.');
    });
  });

  // --- listUsers ---
  describe('listUsers', () => {
    it('Powinien zwrócić listę użytkowników bez haseł', async () => {
      User.find.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([
          { ...mockUser, password: undefined },
          { ...mockUser, _id: '2', password: undefined },
        ]),
      }));

      const result = await userService.listUsers();

      expect(result).toHaveLength(2);
      result.forEach(u => expect(u.password).toBeUndefined());
    });
  });

  // --- changeRole ---
  describe('changeRole', () => {
    it('Powinien zmienić rolę użytkownika na admin', async () => {
      User.findById.mockResolvedValue({ ...mockUser });
      const result = await userService.changeRole(mockUser._id, 'admin');
      expect(result.role).toBe('admin');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('Powinien rzucić błąd dla nieprawidłowej roli', async () => {
      await expect(userService.changeRole(mockUser._id, 'invalid'))
        .rejects.toThrow('Nieprawidłowa rola.');
    });

    it('Powinien rzucić błąd gdy użytkownik nie istnieje', async () => {
      User.findById.mockResolvedValue(null);
      await expect(userService.changeRole(mockUser._id, 'admin'))
        .rejects.toThrow('Użytkownik nie istnieje.');
    });
  });

  // --- deleteUser ---
  describe('deleteUser', () => {
    it('Powinien usunąć użytkownika', async () => {
      User.findById.mockResolvedValue({ ...mockUser });
      await userService.deleteUser(mockUser._id);
      expect(mockUser.deleteOne).toHaveBeenCalled();
    });

    it('Powinien rzucić błąd gdy użytkownik nie istnieje', async () => {
      User.findById.mockResolvedValue(null);
      await expect(userService.deleteUser(mockUser._id))
        .rejects.toThrow('Użytkownik nie istnieje');
    });
  });
});
