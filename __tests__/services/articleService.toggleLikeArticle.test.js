// __tests__/services/articleService.toggleLikeArticle.test.js
const articleService = require('../../services/articleService');
const Article = require('../../models/Article');

jest.mock('../../models/Article');

describe('Serwis: articleService - funkcja toggleLikeArticle', () => {
  const mockArticleId = '507f1f77bcf86cd799439022'; // ObjectId artykułu
  const mockUserId = '507f1f77bcf86cd799439011';    // ObjectId użytkownika
  const mockAuthorId = '507f1f77bcf86cd799439033';  // ObjectId autora (inny niż userId)

  let mockArticleInstance;

  beforeEach(() => {
    jest.clearAllMocks();
        
    // 1. Tworzymy podstawową instancję artykułu
    mockArticleInstance = {
      _id: mockArticleId,
      author: mockAuthorId,
      likes: [], // Początkowo pusta tablica lików
      save: jest.fn().mockImplementation(function() { 
        // Symulujemy, że save zwraca "zapisany" obiekt (this)
        return Promise.resolve(this);
      }),
    };

    // 2. --- KLUCZOWA ZMIANA ---
    // Symulujemy, że `likes` jest tablicą Mongoose z metodą `pull`
    mockArticleInstance.likes = []; // Resetujemy tablicę
    // Dodajemy metodę `pull` do tej tablicy
    mockArticleInstance.likes.pull = jest.fn((userIdToRemove) => {
      // Implementacja pull: usuwa userId z tablicy likes
      const index = mockArticleInstance.likes.indexOf(userIdToRemove);
      if (index > -1) {
        mockArticleInstance.likes.splice(index, 1);
      }
    });
    // --- KONIEC ZMIANY ---

    // Mockujemy Article.findById aby zwracał naszą instancję
    Article.findById.mockResolvedValue(mockArticleInstance);
  });

  it('Powinien dodać like, jeśli użytkownik jeszcze nie polubił artykułu', async () => {
    // ARRANGE
    // Początkowy stan: likes = [] (użytkownik nie polubił)
    mockArticleInstance.likes = [];

    // ACT
    const result = await articleService.toggleLikeArticle(mockArticleId, mockUserId);

    // ASSERT
    // 1. Sprawdzamy, czy znaleziono artykuł
    expect(Article.findById).toHaveBeenCalledWith(mockArticleId);
    // 2. Sprawdzamy, czy save został wywołany
    expect(mockArticleInstance.save).toHaveBeenCalled();
    // 3. Sprawdzamy, czy like został dodany do tablicy (za pomocą push)
    expect(mockArticleInstance.likes).toContain(mockUserId);
    // 4. Sprawdzamy, czy wynik wskazuje na dodanie like i poprawną liczbę
    expect(result).toEqual({
      liked: true,
      totalLikes: 1, // Dodano 1 like
    });
  });

  it('Powinien usunąć like, jeśli użytkownik już polubił artykuł', async () => {
    // ARRANGE
    // Początkowy stan: użytkownik już polubił artykuł
    // NIE NADPISUJEMY tablicy, tylko MODYFIKUJEMY istniejącą
    mockArticleInstance.likes.push(mockUserId); // <- Dodajemy userId do istniejącej tablicy

    // ACT
    const result = await articleService.toggleLikeArticle(mockArticleId, mockUserId);

    // ASSERT
    expect(Article.findById).toHaveBeenCalledWith(mockArticleId);
    expect(mockArticleInstance.save).toHaveBeenCalled();
    // Like powinien zostać usunięty z tablicy (za pomocą pull)
    expect(mockArticleInstance.likes).not.toContain(mockUserId);
    // Sprawdzamy, czy metoda pull została wywołana z prawidłowym argumentem
    expect(mockArticleInstance.likes.pull).toHaveBeenCalledWith(mockUserId);
    expect(result).toEqual({
      liked: false,
      totalLikes: 0, // Usunięto 1 like
    });
  });

  it('Powinien rzucić błąd, jeśli artykuł nie istnieje', async () => {
    // ARRANGE
    Article.findById.mockResolvedValue(null); // Artykuł nie znaleziony

    // ACT & ASSERT
    await expect(articleService.toggleLikeArticle(mockArticleId, mockUserId))
      .rejects
      .toThrow('Artykuł nie znaleziony');
  });

  it('Powinien rzucić błąd, jeśli autor próbuje polubić własny artykuł', async () => {
    // ARRANGE
    // Symulujemy, że autor próbuje polubić własny artykuł
    mockArticleInstance.author = mockUserId; // Autor == userId

    // ACT & ASSERT
    await expect(articleService.toggleLikeArticle(mockArticleId, mockUserId))
      .rejects
      .toThrow('Autor nie może polubić własnego artykułu');
        
    // Save nie powinien zostać wywołany
    expect(mockArticleInstance.save).not.toHaveBeenCalled();
  });
});