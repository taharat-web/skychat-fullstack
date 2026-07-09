const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

// Primary client, used for presence tracking, rate-limit counters, etc.
const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

// Socket.IO's Redis adapter needs its own dedicated pub/sub connections -
// they must not be reused for regular commands.
function createRedisDuplicate() {
  return redisClient.duplicate();
}

module.exports = { redisClient, createRedisDuplicate };
