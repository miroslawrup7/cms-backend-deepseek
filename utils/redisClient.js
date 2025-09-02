// utils/redisClient.js
const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.client) return this.client;

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('Too many retries on Redis. Connection terminated');
              return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, expiration = 3600) { // 1 godzina domyślnie
    if (!this.isConnected) return null;
    try {
      return await this.client.setEx(key, expiration, value);
    } catch (error) {
      console.error('Redis set error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.isConnected) return null;
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
      return null;
    }
  }

  async flushAll() {
    if (!this.isConnected) return null;
    try {
      return await this.client.flushAll();
    } catch (error) {
      console.error('Redis flushAll error:', error);
      return null;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisClient();