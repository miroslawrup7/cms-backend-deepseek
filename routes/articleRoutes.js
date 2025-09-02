const express = require('express');
const router = express.Router();
const { createArticle, getArticles, getArticleById, updateArticle, deleteArticle, toggleLikeArticle } = require('../controllers/articleController');
const upload = require('../middleware/upload');
const requireAuth = require('../middleware/authMiddleware');
const requireAuthorOrAdmin = require('../middleware/requireAuthorOrAdmin');
const validateObjectId = require('../middleware/validateObjectId');
const { validateArticle } = require('../utils/advancedValidate');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Lista i pojedynczy artykuł
router.get('/', cacheMiddleware(300), getArticles); // 5 minut cache
router.get('/:id', validateObjectId(), cacheMiddleware(600), getArticleById); // 10 minut cache

// Tworzenie / edycja / usuwanie (z autoryzacją)
router.post('/', requireAuth, upload.array('images', 5), validateArticle, createArticle); // ✅
router.put('/:id', validateObjectId(), requireAuth, requireAuthorOrAdmin, upload.array('images', 5), validateArticle, updateArticle); // ✅
router.delete('/:id', validateObjectId(), requireAuth, requireAuthorOrAdmin, deleteArticle); // DODANE

// Lajk artykułu
router.post('/:id/like', validateObjectId(), requireAuth, toggleLikeArticle); // DODANE

module.exports = router;
