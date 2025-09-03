// models/Comment.js v.2
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true, // ✅ Dodany indeks
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

commentSchema.index({ article: 1, createdAt: -1 }); // Komentarze dla artykułu
commentSchema.index({ author: 1 }); // Komentarze usera

module.exports = mongoose.model('Comment', commentSchema);
