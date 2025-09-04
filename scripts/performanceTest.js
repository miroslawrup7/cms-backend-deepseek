const mongoose = require('mongoose');
require('dotenv').config();
const { faker } = require('@faker-js/faker');
const Article = require('../models/Article');
const User = require('../models/User');
const Comment = require('../models/Comment');

const PERFORMANCE_TEST_DATA = {
  users: 50,
  articles: 200,
  comments: 1000,
};

async function generateTestData() {
  console.log('🧪 Generowanie danych testowych...');

  // Generuj użytkowników
  const users = [];
  for (let i = 0; i < PERFORMANCE_TEST_DATA.users; i++) {
    users.push({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: '$2a$10$exampleHashedPassword', // przykładowe zahaszowane hasło
      role: faker.helpers.arrayElement(['user', 'author', 'admin']),
    });
  }

  const createdUsers = await User.insertMany(users);
  console.log(`✅ Wygenerowano ${createdUsers.length} użytkowników`);

  // Generuj artykuły
  const articles = [];
  for (let i = 0; i < PERFORMANCE_TEST_DATA.articles; i++) {
    articles.push({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      author: faker.helpers.arrayElement(createdUsers)._id,
      images: [],
      likes: [],
    });
  }

  const createdArticles = await Article.insertMany(articles);
  console.log(`✅ Wygenerowano ${createdArticles.length} artykułów`);

  // Generuj komentarze
  const comments = [];
  for (let i = 0; i < PERFORMANCE_TEST_DATA.comments; i++) {
    comments.push({
      text: faker.lorem.sentence(),
      article: faker.helpers.arrayElement(createdArticles)._id,
      author: faker.helpers.arrayElement(createdUsers)._id,
    });
  }

  await Comment.insertMany(comments);
  console.log(`✅ Wygenerowano ${comments.length} komentarzy`);

  return { users: createdUsers, articles: createdArticles };
}

async function runPerformanceTests() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🚀 Rozpoczynam testy wydajnościowe...\n');

    // Generuj dane testowe
    const testData = await generateTestData();

    // Test 1: Pobieranie artykułów z paginacją
    console.log('\n📊 TEST 1: Pobieranie artykułów z paginacją');
    const start1 = Date.now();
    const articles = await Article.find()
      .populate('author', 'username email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const duration1 = Date.now() - start1;
    console.log(`⏱️ Czas: ${duration1}ms | Ilość: ${articles.length}`);

    // Test 2: Wyszukiwanie pełnotekstowe
    console.log('\n📊 TEST 2: Wyszukiwanie pełnotekstowe');
    const start2 = Date.now();
    const searchResults = await Article.find({ $text: { $search: 'test' } })
      .limit(10)
      .lean();
    const duration2 = Date.now() - start2;
    console.log(`⏱️ Czas: ${duration2}ms | Wyniki: ${searchResults.length}`);

    // Test 3: Pobieranie z sortowaniem po polubieniach
    console.log('\n📊 TEST 3: Sortowanie po polubieniach');
    const start3 = Date.now();
    const likedArticles = await Article.aggregate([
      { $addFields: { likesCount: { $size: '$likes' } } },
      { $sort: { likesCount: -1 } },
      { $limit: 10 },
    ]);
    const duration3 = Date.now() - start3;
    console.log(`⏱️ Czas: ${duration3}ms | Wyniki: ${likedArticles.length}`);

    // Test 4: Złożone zapytanie z joinem
    console.log('\n📊 TEST 4: Artykuły użytkownika z komentarzami');
    const testUser = testData.users[0];
    const start4 = Date.now();
    const userArticles = await Article.find({ author: testUser._id })
      .populate('author')
      .sort({ createdAt: -1 })
      .lean();

    // Dodaj liczbę komentarzy
    const articlesWithComments = await Promise.all(
      userArticles.map(async (article) => {
        const commentCount = await Comment.countDocuments({
          article: article._id,
        });
        return { ...article, commentCount };
      }),
    );
    const duration4 = Date.now() - start4;
    console.log(
      `⏱️ Czas: ${duration4}ms | Artykuły: ${articlesWithComments.length}`,
    );

    console.log('\n🎯 WYNIKI TESTOW:');
    console.log(`📄 Pobieranie artykułów: ${duration1}ms`);
    console.log(`🔍 Wyszukiwanie tekstowe: ${duration2}ms`);
    console.log(`❤️ Sortowanie po like'ach: ${duration3}ms`);
    console.log(`👤 Złożone zapytania: ${duration4}ms`);

    // Czyść dane testowe
    await Article.deleteMany({});
    await Comment.deleteMany({});
    await User.deleteMany({});
    console.log('\n🧹 Wyczyszczono dane testowe');
  } catch (error) {
    console.error('❌ Błąd testów:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Testy zakończone');
  }
}

// Uruchom testy jeśli skrypt jest wywołany bezpośrednio
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { runPerformanceTests, PERFORMANCE_TEST_DATA };
