// models/Article.js v.2
const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    images: [{ type: String }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  },
);

// ✅ POPRAWIONE: Usunięto duplikaty - ZOSTAW TYLKO JEDNĄ DEFINICJĘ KAŻDEGO INDEKSU
articleSchema.index({ author: 1, createdAt: -1 }); // dla listy artykułów usera
articleSchema.index({ title: 'text', content: 'text' }); // dla wyszukiwania tekstowego
articleSchema.index({ createdAt: -1 }); // Dla sortowania najnowszych

module.exports = mongoose.model('Article', articleSchema);
