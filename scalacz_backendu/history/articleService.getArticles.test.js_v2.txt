// __tests__/services/articleService.getArticles.test.js
const articleService = require('../../services/articleService');
const Article = require('../../models/Article');
const Comment = require('../../models/Comment');

jest.mock('../../models/Article');
jest.mock('../../models/Comment');

describe('Serwis: articleService - funkcja getArticles', () => {
  const mockArticlesData = [
    { 
      _id: 'article1', 
      title: 'Test Article 1', 
      author: { email: 'user1@test.com' }, 
      content: 'Content 1', 
      images: [], 
      likes: [],
      createdAt: new Date('2023-01-01'),
    },
    { 
      _id: 'article2', 
      title: 'Test Article 2', 
      author: { email: 'user2@test.com' }, 
      content: 'Content 2', 
      images: [], 
      likes: ['user1'],
      createdAt: new Date('2023-01-02'),
    },
  ];

  const mockCommentCounts = { article1: 3, article2: 5 };

  // Helper function to create a chainable mock
  const createChainableMock = (finalValue) => {
    const mock = jest.fn().mockReturnThis();
    mock.sort = jest.fn().mockReturnThis();
    mock.skip = jest.fn().mockReturnThis();
    mock.limit = jest.fn().mockReturnThis();
    mock.populate = jest.fn().mockResolvedValue(finalValue);
    return mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
        
    // Mockujemy Comment.countDocuments dla każdego artykułu
    Comment.countDocuments.mockImplementation((query) => {
      const articleId = query.article.toString();
      return Promise.resolve(mockCommentCounts[articleId] || 0);
    });

    // Resetujemy wszystkie mocks Article
    Article.countDocuments.mockReset();
    Article.find.mockReset();
    Article.aggregate.mockReset();
  });

  it('Powinien zwrócić listę artykułów z paginacją (sort: newest)', async () => {
    // ARRANGE
    const page = 1, limit = 2, search = '', sort = 'newest';
    const totalCount = 2;

    // Mock standardowego find z łańcuchem metod
    Article.countDocuments.mockResolvedValue(totalCount);
    Article.find.mockImplementation(() => createChainableMock(mockArticlesData));

    // ACT
    const result = await articleService.getArticles(page, limit, search, sort);

    // ASSERT
    expect(Article.countDocuments).toHaveBeenCalled();
    expect(Article.find).toHaveBeenCalled();
    expect(result).toEqual({
      articles: [
        { 
          _id: 'article1', 
          title: 'Test Article 1', 
          content: 'Content 1',
          likesCount: 0,
          commentCount: 3,
          author: { email: 'user1@test.com' },
          thumbnail: null,
          createdAt: new Date('2023-01-01'),
        },
        { 
          _id: 'article2', 
          title: 'Test Article 2', 
          content: 'Content 2',
          likesCount: 1,
          commentCount: 5,
          author: { email: 'user2@test.com' },
          thumbnail: null,
          createdAt: new Date('2023-01-02'),
        },
      ],
      total: totalCount,
    });
  });

  it('Powinien zwrócić listę artykułów (sort: mostLiked - agregacja)', async () => {
    // ARRANGE
    const page = 1, limit = 2, search = '', sort = 'mostLiked';
    const totalCount = 2;

    // Mock agregacji MongoDB - ZWRACA TABLICĘ
    const mockAggregateResult = [
      { 
        _id: 'article1', 
        title: 'Test Article 1', 
        content: 'Content 1',
        author: { email: 'user1@test.com' },
        images: [],
        likes: [],
        likesCount: 0,
        createdAt: new Date('2023-01-01'),
      },
      { 
        _id: 'article2', 
        title: 'Test Article 2', 
        content: 'Content 2', 
        author: { email: 'user2@test.com' },
        images: [],
        likes: ['user1'],
        likesCount: 1,
        createdAt: new Date('2023-01-02'),
      },
    ];
        
    // POPRAWNY MOCK: aggregate() zwraca obiekt z metodą exec()
    Article.aggregate.mockResolvedValue(mockAggregateResult);
    Article.countDocuments.mockResolvedValue(totalCount);

    // ACT
    const result = await articleService.getArticles(page, limit, search, sort);

    // ASSERT
    expect(Article.aggregate).toHaveBeenCalled();
    expect(result.total).toBe(totalCount);
    expect(Array.isArray(result.articles)).toBe(true);
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0]).toHaveProperty('commentCount');
    expect(result.articles[0]).toHaveProperty('likesCount');
    expect(result.articles[0].likesCount).toBe(0);
  });

  it('Powinien przefiltrować artykuły wyszukiwaniem (search)', async () => {
    // ARRANGE
    const page = 1, limit = 2, search = 'Test', sort = 'newest';
    const filteredArticles = [mockArticlesData[0]];
    const totalCount = 1;

    Article.countDocuments.mockResolvedValue(totalCount);
    Article.find.mockImplementation(() => createChainableMock(filteredArticles));

    // ACT
    const result = await articleService.getArticles(page, limit, search, sort);

    // ASSERT
    expect(Article.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: 'Test', $options: 'i' } },
        { content: { $regex: 'Test', $options: 'i' } },
      ],
    });
    expect(result.total).toBe(totalCount);
    expect(result.articles).toHaveLength(1);
  });

  it('Powinien obsłużyć pustą listę artykułów', async () => {
    // ARRANGE
    const page = 1, limit = 2, search = '', sort = 'newest';
    const totalCount = 0;

    Article.countDocuments.mockResolvedValue(totalCount);
    Article.find.mockImplementation(() => createChainableMock([]));

    // ACT
    const result = await articleService.getArticles(page, limit, search, sort);

    // ASSERT
    expect(result.articles).toEqual([]);
    expect(result.total).toBe(0);
  });
});