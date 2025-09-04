// scripts/createIndexes.js
const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('🗄️ Tworzenie indeksów...');

    // Wymuś tworzenie indeksów
    const Article = require('../models/Article');
    const Comment = require('../models/Comment');
    const User = require('../models/User');

    await Article.createIndexes();
    await Comment.createIndexes();
    await User.createIndexes();

    console.log('✅ Indeksy stworzone pomyślnie');
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd tworzenia indeksów:', error);
    process.exit(1);
  }
};

createIndexes();
