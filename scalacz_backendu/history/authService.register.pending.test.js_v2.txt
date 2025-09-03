// __tests__/services/authService.registerPending.test.js
const authService = require('../../services/authService');
const PendingUser = require('../../models/PendingUser');
const User = require('../../models/User');

// Mockujemy modele Mongoose
jest.mock('../../models/PendingUser');
jest.mock('../../models/User');

describe('Serwis: authService - funkcja registerPending', () => {
  // Dane testowe
  const mockUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpass123',
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Czyścimy mocki przed każdym testem
  });

  it('Powinien pomyślnie zarejestrować użytkownika oczekującego', async () => {
    // ARRANGE
    // 1. Mockujemy, że NIE ma użytkownika w żadnej z kolekcji
    User.findOne.mockResolvedValue(null);
    PendingUser.findOne.mockResolvedValue(null);
    // 2. Mockujemy metodę `save` na nowej instancji PendingUser
    const mockSave = jest.fn().mockResolvedValue(true);
    PendingUser.mockImplementation(() => ({
      save: mockSave,
    }));

    // ACT
    // Wywołujemy funkcję - nie powinna rzucić błędem
    await expect(authService.registerPending(
      mockUserData.username,
      mockUserData.email,
      mockUserData.password,
      mockUserData.role,
    )).resolves.not.toThrow(); // Sprawdzamy, że Promise się resolves (nie rejectuje)

    // ASSERT
    // Sprawdzamy, czy findOne był wywołany z poprawnym emailem
    expect(PendingUser.findOne).toHaveBeenCalledWith({ email: mockUserData.email });
    expect(User.findOne).toHaveBeenCalledWith({ email: mockUserData.email });
    // Sprawdzamy, czy konstruktor PendingUser został wywołany z prawidłowymi danymi
    expect(PendingUser).toHaveBeenCalledWith({
      username: mockUserData.username,
      email: mockUserData.email,
      password: mockUserData.password, // jeszcze nie zahashowane!
      role: mockUserData.role,
    });
    // Sprawdzamy, czy save został wywołany na nowym obiekcie
    expect(mockSave).toHaveBeenCalled();
  });

  it('Powinien rzucić błąd jeśli użytkownik (Pending) już istnieje', async () => {
    // ARRANGE
    // Symulujemy, że użytkownik OCZEKUJĄCY już istnieje
    PendingUser.findOne.mockResolvedValue({ email: mockUserData.email });

    // ACT & ASSERT
    // Spodziewamy się, że funkcja rzuci konkretnym błędem
    await expect(authService.registerPending(
      mockUserData.username,
      mockUserData.email,
      mockUserData.password,
      mockUserData.role,
    )).rejects.toThrow('Email jest już zajęty.');
    
    // Optional: Sprawdzamy, czy findOne dla User NIE został wywołany (optymalizacja)
    // expect(User.findOne).not.toHaveBeenCalled();
  });

  it('Powinien rzucić błąd jeśli użytkownik (User) już istnieje', async () => {
    // ARRANGE
    // Symulujemy, że użytkownik ZATWIERDZONY już istnieje
    PendingUser.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue({ email: mockUserData.email });

    // ACT & ASSERT
    await expect(authService.registerPending(
      mockUserData.username,
      mockUserData.email,
      mockUserData.password,
      mockUserData.role,
    )).rejects.toThrow('Email jest już zajęty.');
  });

  // Możesz też dodać test dla walidacji (np. brak username)
  it('Powinien rzucić błąd walidacji jeśli brakuje wymaganego pola', async () => {
    // ACT & ASSERT - pomijamy username
    await expect(authService.registerPending(
      '', // puste username
      mockUserData.email,
      mockUserData.password,
      mockUserData.role,
    )).rejects.toThrow('Nazwa użytkownika jest wymagana.');
  });
});