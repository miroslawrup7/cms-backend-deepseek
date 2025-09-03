// __tests__/controllers/adminController.test.js
const adminController = require('../../controllers/adminController');
const PendingUser = require('../../models/PendingUser');
const User = require('../../models/User');
const { sendMail } = require('../../utils/mailer');
/* eslint-disable no-unused-vars */
const AppError = require('../../utils/AppError');
/* eslint-enable no-unused-vars */
const bcrypt = require('bcryptjs');

// Mockujemy zależności
jest.mock('../../models/PendingUser');
jest.mock('../../models/User');
jest.mock('../../utils/mailer');
jest.mock('bcryptjs');
jest.mock('../../utils/AppError', () => {
  return jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  });
});

describe('Kontroler: adminController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request, response i next
    req = {
      query: {},
      params: {},
      body: {},
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getPendingUsers', () => {
    it('Powinien zwrócić listę użytkowników oczekujących z paginacją', async () => {
      // ARRANGE
      req.query = { page: '1', limit: '10', search: 'test' };
      const mockUsers = [
        { _id: '1', username: 'testuser1', email: 'test1@example.com' },
        { _id: '2', username: 'testuser2', email: 'test2@example.com' },
      ];

      PendingUser.countDocuments.mockResolvedValue(2);
      PendingUser.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      // ACT
      await adminController.getPendingUsers(req, res, next);

      // ASSERT
      expect(PendingUser.countDocuments).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'test', $options: 'i' } },
          { email: { $regex: 'test', $options: 'i' } },
        ],
      });
      expect(res.json).toHaveBeenCalledWith({
        total: 2,
        page: 1,
        limit: 10,
        users: mockUsers,
      });
    });

    it('Powinien obsłużyć błąd podczas pobierania użytkowników', async () => {
      // ARRANGE
      const error = new Error('Database error');
      PendingUser.countDocuments.mockRejectedValue(error);

      // ACT
      await adminController.getPendingUsers(req, res, next);

      // ASSERT
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('approveUser', () => {
    it('Powinien zatwierdzić użytkownika i wysłać email', async () => {
      // ARRANGE
      req.params = { id: 'pending123' };
      const mockPendingUser = {
        _id: 'pending123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'rawpassword',
        role: 'user',
        deleteOne: jest.fn().mockResolvedValue(true),
      };

      const mockSavedUser = {
        _id: 'newUserId123', // ✅ TUTAJ JEST _id
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      PendingUser.findById.mockResolvedValue(mockPendingUser);
      User.findOne.mockResolvedValue(null);

      // Mock bcrypt.hash
      bcrypt.hash.mockResolvedValue('hashedpassword');

      // Mock User constructor and save - ZWRACA OBIEKT Z _id
      const mockSave = jest.fn().mockResolvedValue(mockSavedUser);
      User.mockImplementation(() => ({
        save: mockSave,
      }));

      sendMail.mockResolvedValue(true);

      // ACT
      await adminController.approveUser(req, res, next);

      // ASSERT
      expect(PendingUser.findById).toHaveBeenCalledWith('pending123');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('rawpassword', 10);
      expect(User).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'user',
      });
      expect(mockSave).toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Użytkownik zatwierdzony i dodany do systemu.',
        userId: 'newUserId123', // ✅ TERAZ BĘDZIE PASOWAĆ
      });
    });

    it('Powinien rzucić błąd gdy wniosek nie istnieje', async () => {
      // ARRANGE
      req.params = { id: 'nonexistent' };
      PendingUser.findById.mockResolvedValue(null);

      // ACT
      await adminController.approveUser(req, res, next);

      // ASSERT
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    it('Powinien rzucić błąd gdy email już istnieje w systemie', async () => {
      // ARRANGE
      req.params = { id: 'pending123' };
      const mockPendingUser = {
        _id: 'pending123',
        email: 'existing@example.com',
        deleteOne: jest.fn().mockResolvedValue(true),
      };

      PendingUser.findById.mockResolvedValue(mockPendingUser);
      User.findOne.mockResolvedValue({ email: 'existing@example.com' });

      // ACT
      await adminController.approveUser(req, res, next);

      // ASSERT
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe('rejectUser', () => {
    it('Powinien odrzucić użytkownika i wysłać email', async () => {
      // ARRANGE
      req.params = { id: 'pending123' };
      const mockPendingUser = {
        _id: 'pending123',
        username: 'testuser',
        email: 'test@example.com',
        deleteOne: jest.fn().mockResolvedValue(true),
      };

      PendingUser.findById.mockResolvedValue(mockPendingUser);
      sendMail.mockResolvedValue(true);

      // ACT
      await adminController.rejectUser(req, res, next);

      // ASSERT
      expect(PendingUser.findById).toHaveBeenCalledWith('pending123');
      expect(sendMail).toHaveBeenCalled();
      expect(mockPendingUser.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Wniosek został odrzucony.',
      });
    });

    it('Powinien obsłużyć błąd wysyłki emaila przy odrzuceniu', async () => {
      // ARRANGE
      req.params = { id: 'pending123' };
      const mockPendingUser = {
        _id: 'pending123',
        username: 'testuser',
        email: 'test@example.com',
        deleteOne: jest.fn().mockResolvedValue(true),
      };

      PendingUser.findById.mockResolvedValue(mockPendingUser);
      const mailError = new Error('SMTP error');
      sendMail.mockRejectedValue(mailError);

      // ACT
      await adminController.rejectUser(req, res, next);

      // ASSERT
      expect(sendMail).toHaveBeenCalled();
      expect(mockPendingUser.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Wniosek został odrzucony.',
      });
    });

    it('Powinien rzucić błąd gdy wniosek nie istnieje', async () => {
      // ARRANGE
      req.params = { id: 'nonexistent' };
      PendingUser.findById.mockResolvedValue(null);

      // ACT
      await adminController.rejectUser(req, res, next);

      // ASSERT
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(404);
    });
  });
});
