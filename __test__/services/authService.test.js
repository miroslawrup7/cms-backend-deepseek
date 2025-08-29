// __tests__/services/authService.test.js
// Import funkcji, którą chcemy testować
const authService = require('../../services/authService');
// Import modelu, który zamockujemy
const User = require('../../models/User');
// Import bcrypta, którego funkcję compare też zamockujemy
const bcrypt = require('bcryptjs');
// Import JWT, którego też mockujemy (opcjonalnie, na razie nie musimy)
// const jwt = require('jsonwebtoken');

// 1. MOCKUJEMY ZALEŻNOŚCI
// Mówimy Jestowi: "za każdym razem, gdy ktoś zaimportuje '../../models/User',
// zastąp go tym automatycznie wygenerowanym mockiem (fałszywym obiektem)"
jest.mock('../../models/User');
// To samo robimy dla bcrypta
jest.mock('bcryptjs');

// 2. OPISUJEMY GRUPĘ TESTÓW
describe('Serwis: authService - funkcja login', () => {
  // Zmienne, które będziemy używać w testach
  const mockEmail = 'test@example.com';
  const mockPassword = 'haslo123';
  const mockWrongPassword = 'zlehaslo';
  const mockUserId = '507f1f77bcf86cd799439011'; // przykładowe ObjectId

  // Ta funkcja uruchamia się przed KAŻDYM testem w tej grupie
  // Służy do resetowania stanu mocków, aby testy się nie nakładały
  beforeEach(() => {
    jest.clearAllMocks(); // Czyści wszystkie mocki (np. ile razy zostały wywołane)
  });

  // 3. PIERWSZY TEST: Powinien rzucić błąd, gdy użytkownik nie istnieje
  it('Powinien rzucić błąd "Nieprawidłowy email lub hasło" jeśli użytkownik nie istnieje', async () => {
    // ARRANGE: Przygotowujemy mocka.
    // Symulujemy, że User.findOne zwraca null (nie znaleziono użytkownika)
    User.findOne.mockResolvedValue(null);

    // ACT & ASSERT: Działamy i sprawdzamy jednocześnie.
    // Spodziewamy się, że wywołanie funkcji login RZUCI wyjątkiem (reject).
    // Używamy 'rejects' aby obsłużyć Promise który został odrzucony.
    // Używamy 'toThrow' aby sprawdzić treść błędu.
    await expect(authService.login(mockEmail, mockPassword))
      .rejects
      .toThrow('Nieprawidłowy email lub hasło.');

    // (OPCJONALNIE) Możemy też sprawdzić, czy findOne został wywołany z poprawnymi argumentami
    expect(User.findOne).toHaveBeenCalledWith({ email: mockEmail.toLowerCase() });
  });

  // 4. DRUGI TEST: Powinien rzucić błąd, gdy hasło jest niepoprawne
  it('Powinien rzucić błąd "Nieprawidłowy email lub hasło" jeśli hasło jest niepoprawne', async () => {
    // ARRANGE: Przygotowujemy mocka.
    // 1. Symulujemy, że User.findOne znajdzie użytkownika
    const mockUser = {
      _id: mockUserId,
      email: mockEmail,
      password: 'zahashowane_haslo_z_bazy', // to jest hash, który NIE pasuje do mockPassword
    };
    User.findOne.mockResolvedValue(mockUser);

    // 2. Symulujemy, że bcrypt.compare zwraca false (hasła się nie zgadzają)
    bcrypt.compare.mockResolvedValue(false);

    // ACT & ASSERT
    await expect(authService.login(mockEmail, mockPassword))
      .rejects
      .toThrow('Nieprawidłowy email lub hasło.');

    // (OPCJONALNIE) Sprawdzamy, czy compare zostało wywołane z prawidłowymi argumentami
    expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockUser.password);
  });

  // 5. TRZECI TEST: Powinien zalogować użytkownika i zwrócić token
  it('Powinien zwrócić token JWT gdy email i hasło są poprawne', async () => {
    // ARRANGE: Przygotowujemy mocka.
    // 1. Znów symulujemy znalezienie użytkownika
    const mockUser = {
      _id: mockUserId,
      email: mockEmail,
      password: 'zahashowane_haslo_z_bazy',
    };
    User.findOne.mockResolvedValue(mockUser);

    // 2. Tym razem bcrypt.compare zwraca true (hasła się zgadzają)
    bcrypt.compare.mockResolvedValue(true);

    // ACT: Wywołujemy testowaną funkcję
    // Nie mockujemy JWT, więc token będzie jakimś prawdziwym, losowym stringiem
    const result = await authService.login(mockEmail, mockPassword);

    // ASSERT: Sprawdzamy wynik
    // 1. Czy wynik jest stringiem (tokenem)?
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(20); // Token powinien być dość długim stringiem

    // 2. Czy findOne i compare zostały wywołane?
    expect(User.findOne).toHaveBeenCalledWith({ email: mockEmail.toLowerCase() });
    expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockUser.password);
  });
});