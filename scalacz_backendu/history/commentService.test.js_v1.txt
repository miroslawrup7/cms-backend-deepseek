// __tests__/services/commentService.test.js
const commentService = require('../../services/commentService');
const Comment = require('../../models/Comment');
const Article = require('../../models/Article');

jest.mock('../../models/Comment');
jest.mock('../../models/Article');

describe('Serwis: commentService', () => {
  const mockArticleId = '507f1f77bcf86cd799439022';
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockCommentId = '507f1f77bcf86cd799439033';
  const mockCommentText = 'To jest bardzo przemyślany komentarz';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addComment', () => {
    it('Powinien dodać komentarz do istniejącego artykułu', async () => {
      // ARRANGE
      Article.findById.mockResolvedValue({ _id: mockArticleId });
      // Mock Comment.create zamiast new Comment().save()
      Comment.create.mockResolvedValue({
        _id: mockCommentId,
        text: mockCommentText,
        article: mockArticleId,
        author: mockUserId,
      });

      // ACT
      const result = await commentService.addComment(
        mockArticleId,
        mockUserId,
        mockCommentText,
      );

      // ASSERT
      expect(Article.findById).toHaveBeenCalledWith(mockArticleId);
      expect(Comment.create).toHaveBeenCalledWith({
        text: mockCommentText,
        article: mockArticleId,
        author: mockUserId,
      });
      expect(result.text).toBe(mockCommentText);
    });

    it('Powinien rzucić błąd jeśli artykuł nie istnieje', async () => {
      // ARRANGE
      Article.findById.mockResolvedValue(null);

      // ACT & ASSERT - Uwzględnij kropkę w komunikacie
      await expect(
        commentService.addComment(mockArticleId, mockUserId, mockCommentText),
      ).rejects.toThrow('Nie znaleziono artykułu.');
    });

    it('Powinien rzucić błąd walidacji dla zbyt krótkiego komentarza', async () => {
      // ARRANGE
      Article.findById.mockResolvedValue({ _id: mockArticleId });
      const shortText = 'Krótk';

      // ACT & ASSERT
      await expect(
        commentService.addComment(mockArticleId, mockUserId, shortText),
      ).rejects.toThrow('Komentarz musi mieć co najmniej 6 znaków');

      // Dodatkowo: upewnij się, że Comment.create NIE został wywołany
      expect(Comment.create).not.toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('Powinien zwrócić listę komentarzy dla artykułu', async () => {
      // ARRANGE
      const mockComments = [
        { _id: 'comment1', text: 'Komentarz 1', author: { username: 'user1' } },
        { _id: 'comment2', text: 'Komentarz 2', author: { username: 'user2' } },
      ];
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockComments),
      });

      // ACT
      const result = await commentService.getComments(mockArticleId);

      // ASSERT
      expect(Comment.find).toHaveBeenCalledWith({ article: mockArticleId });
      expect(result).toEqual(mockComments);
    });
  });

  describe('updateComment', () => {
    it('Powinien zaktualizować komentarz jeśli użytkownik jest autorem', async () => {
      // ARRANGE
      const mockComment = {
        _id: mockCommentId,
        text: 'Stara treść',
        author: mockUserId,
        save: jest.fn().mockResolvedValue({
          _id: mockCommentId,
          text: 'Nowa treść',
          author: mockUserId,
        }),
      };
      Comment.findById.mockResolvedValue(mockComment);

      // ACT
      const result = await commentService.updateComment(
        mockCommentId,
        mockUserId,
        'user',
        'Nowa treść',
      );

      // ASSERT
      expect(Comment.findById).toHaveBeenCalledWith(mockCommentId);
      expect(mockComment.save).toHaveBeenCalled();
      expect(result.text).toBe('Nowa treść');
    });

    it('Powinien rzucić błąd jeśli komentarz nie istnieje', async () => {
      // ARRANGE
      Comment.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        commentService.updateComment(
          mockCommentId,
          mockUserId,
          'user',
          'Nowa treść',
        ),
      ).rejects.toThrow('Komentarz nie istnieje');
    });
  });

  describe('deleteComment', () => {
    it('Powinien usunąć komentarz jeśli użytkownik jest autorem', async () => {
      // ARRANGE
      const mockComment = {
        _id: mockCommentId,
        author: mockUserId,
        deleteOne: jest.fn().mockResolvedValue(true),
      };
      Comment.findById.mockResolvedValue(mockComment);

      // ACT
      await commentService.deleteComment(mockCommentId, mockUserId, 'user');

      // ASSERT
      expect(Comment.findById).toHaveBeenCalledWith(mockCommentId);
      expect(mockComment.deleteOne).toHaveBeenCalled();
    });
  });
});
