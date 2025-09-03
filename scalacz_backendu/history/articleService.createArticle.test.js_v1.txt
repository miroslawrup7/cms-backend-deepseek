 
// Test files often need unused variables for mocks

// __tests__/services/articleService.createArticle.test.js
const articleService = require('../../services/articleService');
const Article = require('../../models/Article');
jest.mock('../../models/Article');

describe('Serwis: articleService - funkcja createArticle', () => {
  const mockTitle = 'Testowy tytuł artykułu';
  const mockContent = 'To jest treść testowego artykułu, która jest wystarczająco długa, aby spełnić wymagania.';
  const mockAuthorId = '507f1f77bcf86cd799439011';
  const mockImagePaths = ['uploads/image1.jpg', 'uploads/image2.png'];

  let mockArticleInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // 1. Tworzymy obiekt-impostor. Symuluje instancję Mongoose, która ma metodę `.save`.
    mockArticleInstance = {
      save: jest.fn(), // Mockujemy metodę save
    };
    // 2. Gdy konstruktor "Article" jest wywoływany, zwracamy naszego impostora.
    Article.mockImplementation(() => mockArticleInstance);
  });

  it('Powinien pomyślnie utworzyć artykuł z poprawnymi danymi', async () => {
    // ARRANGE
    const mockSavedArticleData = {
      _id: 'someArticleId',
      title: mockTitle,
      content: mockContent,
      author: mockAuthorId,
      images: mockImagePaths,
    };
    mockArticleInstance.save.mockResolvedValue(mockSavedArticleData);

    // ACT
    const result = await articleService.createArticle(mockTitle, mockContent, mockAuthorId, mockImagePaths);

    // ASSERT
    expect(Article).toHaveBeenCalledWith({
      title: mockTitle,
      content: mockContent,
      author: mockAuthorId,
      images: mockImagePaths,
    });
    expect(mockArticleInstance.save).toHaveBeenCalled();
    expect(result).toBe(mockArticleInstance);
  });

  it('Powinien rzucić błąd jeśli tytuł jest za krótki', async () => {
    // ARRANGE
    const shortTitle = 'A';

    // ACT & ASSERT
    await expect(articleService.createArticle(shortTitle, mockContent, mockAuthorId, mockImagePaths))
      .rejects
      .toThrow('Tytuł musi mieć co najmniej 5 znaków');
        
    // Sprawdzamy, czy save NIE został wywołany
    expect(mockArticleInstance.save).not.toHaveBeenCalled();
  });

  it('Powinien rzucić błąd jeśli treść jest za krótka', async () => {
    // ARRANGE
    const shortContent = 'Krótka';

    // ACT & ASSERT
    await expect(articleService.createArticle(mockTitle, shortContent, mockAuthorId, mockImagePaths))
      .rejects
      .toThrow('Treść musi mieć co najmniej 20 znaków');
        
    expect(mockArticleInstance.save).not.toHaveBeenCalled();
  });

  it('Powinien rzucić błąd jeśli brakuje tytułu lub treści', async () => {
    // ACT & ASSERT - brak tytułu
    await expect(articleService.createArticle('', mockContent, mockAuthorId, mockImagePaths))
      .rejects
      .toThrow(); // Może rzucić ogólny błąd walidacji

    // ACT & ASSERT - brak treści
    await expect(articleService.createArticle(mockTitle, '', mockAuthorId, mockImagePaths))
      .rejects
      .toThrow();

    expect(mockArticleInstance.save).not.toHaveBeenCalled();
  });
});