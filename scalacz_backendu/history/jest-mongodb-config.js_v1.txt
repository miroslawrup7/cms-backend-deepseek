// jest-mongodb-config.js (w root projektu)
module.exports = {
  mongodbMemoryServerOptions: {
    instance: {
      dbName: 'cms-test', // nazwa testowej bazy
    },
    binary: {
      version: '6.0.0', // wersja MongoDB
      skipMD5: true,
    },
    autoStart: false,
  },
};
