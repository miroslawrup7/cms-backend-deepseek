// services/articleService.js
const logger = require('../utils/logger');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const fs = require('fs');
const path = require('path');
const { sanitizeTitle, sanitizeBody } = require('../utils/sanitize');
const validateFields = require('../utils/validate');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Helper functions
function toPublicPath(p) {
  if (!p) return null;
  const s = String(p).replace(/\\/g, '/');
  if (s.startsWith('uploads/')) return s;
  const m = s.match(/uploads\/(.+)$/i);
  return m ? `uploads/${m[1]}` : `uploads/${path.basename(s)}`;
}

function toUploadsRel(p) {
  if (!p) return '';
  const s = String(p);
  const m = s.match(/uploads[/\\]+(.+)$/i);
  return m ? m[1] : path.basename(s);
}

// Create article
const createArticle = async (title, content, authorId, imagePaths) => {
  const errors = validateFields({
    title: [title, 'Tytuł jest wymagany'],
    content: [content, 'Treść jest wymagana'],
  });

  if (title && title.length < 5)
    errors.push('Tytuł musi mieć co najmniej 5 znaków');
  if (content && content.length < 20)
    errors.push('Treść musi mieć co najmniej 20 znaków');
  if (errors.length) throw new Error(errors.join(' '));

  const sanitizedTitle = sanitizeTitle(title);
  const sanitizedContent = sanitizeBody(content);

  const newArticle = new Article({
    title: sanitizedTitle,
    content: sanitizedContent,
    images: imagePaths,
    author: authorId,
  });

  console.log('RAW TITLE:', title);
  console.log('SANITIZED TITLE:', sanitizeTitle(title));

  await newArticle.save();
  return newArticle;
};

// Get articles with filtering, sorting, and pagination - ZOPTYMALIZOWANE
const getArticles = async (
  page = 1,
  limit = 5,
  search = '',
  sort = 'newest',
) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // ✅ ZOPTYMALIZOWANE: Build query with full-text search if available
  const query = search
    ? { $text: { $search: search } } // ✅ Uses full-text index
    : {};

  // ✅ ZOPTYMALIZOWANE: Sort options that use indexes
  const sortOptions = {
    newest: { createdAt: -1 }, // ✅ Uses index
    oldest: { createdAt: 1 }, // ✅ Uses index
    mostLiked: { likesCount: -1 }, // ✅ Uses index
    titleAZ: { title: 1, createdAt: -1 }, // ✅ Uses compound index
    titleZA: { title: -1, createdAt: -1 }, // ✅ Uses compound index
  };

  // ✅ ZOPTYMALIZOWANE: Use Promise.all for parallel execution
  const [articles, total] = await Promise.all([
    Article.find(query)
      .select('title content author images createdAt likes') // ✅ Only needed fields
      .populate('author', 'email username') // ✅ Only needed author fields
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(), // ✅ Faster data return

    Article.countDocuments(query),
  ]);

  // ✅ ZOPTYMALIZOWANE: Parallel comment counts
  const articlesWithCounts = await Promise.all(
    articles.map(async (article) => {
      const commentCount = await Comment.countDocuments({
        article: article._id,
      });
      return {
        ...article,
        likesCount: Array.isArray(article.likes) ? article.likes.length : 0,
        commentCount,
        thumbnail:
          article.images && article.images.length > 0
            ? toPublicPath(article.images[0])
            : null,
      };
    }),
  );

  return { articles: articlesWithCounts, total };
};

// Get article by ID - ZOPTYMALIZOWANE
const getArticleById = async (id) => {
  // ✅ ZOPTYMALIZOWANE: Single query with projection
  const article = await Article.findById(id)
    .select('-__v') // ✅ Exclude unnecessary fields
    .populate('author', 'username email') // ✅ Only needed author fields
    .lean(); // ✅ Faster data return

  if (!article) throw new Error('Nie znaleziono artykułu');

  // ✅ ZOPTYMALIZOWANE: Parallel comment count
  const [commentCount] = await Promise.all([
    Comment.countDocuments({ article: article._id }),
  ]);

  return {
    ...article,
    images: Array.isArray(article.images)
      ? article.images.map(toPublicPath)
      : [],
    commentCount,
  };
};

// Update article
const updateArticle = async (
  articleId,
  updateData,
  userId,
  userRole,
  files,
) => {
  const { title, content, removeImages } = updateData;
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Artykuł nie znaleziony');

  // Check permissions
  if (String(article.author) !== String(userId) && userRole !== 'admin') {
    throw new Error('Brak uprawnień do edycji');
  }

  // Handle image removal
  let imagesToRemove = [];
  if (typeof removeImages === 'string') imagesToRemove = [removeImages];
  else if (Array.isArray(removeImages)) imagesToRemove = removeImages;

  const normalizedToRemove = imagesToRemove.map(toUploadsRel);

  // Remove images from disk
  for (const rel of normalizedToRemove) {
    const full = path.join(UPLOADS_DIR, rel);
    if (full.startsWith(UPLOADS_DIR)) {
      fs.unlink(full, (err) => {
        if (err && err.code !== 'ENOENT') {
          logger.error(`Błąd usuwania pliku: ${full}`, err);
        }
      });
    }
  }

  // Update article images
  article.images = (article.images || []).filter((img) => {
    const rel = toUploadsRel(img);
    return !normalizedToRemove.includes(rel);
  });

  // Add new images
  if (files && files.length > 0) {
    const newImages = files.map((f) =>
      `uploads/${f.filename}`.replace(/\\/g, '/'),
    );
    article.images.push(...newImages);
  }

  // Validate and update title and content
  const errors = [];
  if (title) {
    if (title.length < 5) errors.push('Tytuł musi mieć co najmniej 5 znaków');
    else article.title = sanitizeTitle(title);
  }
  if (content) {
    if (content.length < 20)
      errors.push('Treść musi mieć co najmniej 20 znaków');
    else article.content = sanitizeBody(content);
  }
  if (errors.length) throw new Error(errors.join(' '));

  await article.save();
  return article;
};

// Delete article
const deleteArticle = async (articleId, userId, userRole) => {
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Artykuł nie istnieje');

  if (String(article.author) !== String(userId) && userRole !== 'admin') {
    throw new Error('Brak uprawnień');
  }

  // Remove images from disk
  for (const img of article.images || []) {
    const rel = toUploadsRel(img);
    const full = path.join(UPLOADS_DIR, rel);
    if (full.startsWith(UPLOADS_DIR)) {
      fs.unlink(full, (err) => {
        if (err && err.code !== 'ENOENT') {
          logger.error(`Błąd usuwania pliku ${full}:`, err);
        }
      });
    }
  }

  // ✅ ZOPTYMALIZOWANE: Parallel operations
  await Promise.all([
    Comment.deleteMany({ article: article._id }),
    article.deleteOne(),
  ]);
};

// Toggle like on article
const toggleLikeArticle = async (articleId, userId) => {
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Artykuł nie znaleziony');

  // Author cannot like their own article
  if (article.author && String(article.author) === String(userId)) {
    throw new Error('Autor nie może polubić własnego artykułu');
  }

  const alreadyLiked =
    Array.isArray(article.likes) &&
    article.likes.some((id) => String(id) === String(userId));

  if (alreadyLiked) article.likes.pull(userId);
  else article.likes.push(userId);

  await article.save();

  return {
    liked: !alreadyLiked,
    totalLikes: Array.isArray(article.likes) ? article.likes.length : 0,
  };
};

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  toggleLikeArticle,
};
