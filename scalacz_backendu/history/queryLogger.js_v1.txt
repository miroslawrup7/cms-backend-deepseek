// utils/queryLogger.js
const mongoose = require('mongoose');

// Włącz logging zapytań MongoDB
mongoose.set('debug', function(coll, method, query, doc) {
  console.log(`🗄️ MongoDB Query: ${coll}.${method}`, {
    query: JSON.stringify(query),
    doc: doc ? JSON.stringify(doc) : undefined,
  });
});

module.exports = mongoose;