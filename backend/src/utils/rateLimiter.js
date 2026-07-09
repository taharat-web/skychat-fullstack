const { redisClient } = require('../config/redis');

/**
 * Fixed-window rate limiter backed by Redis (so it works correctly across
 * multiple backend instances, unlike an in-memory counter).
 *
 * @param {string} key - unique bucket key, e.g. `msg:${userId}`
 * @param {number} limit - max allowed actions per window
 * @param {number} windowSeconds - window size in seconds
 * @returns {Promise<boolean>} true if the action is allowed
 */
async function checkRateLimit(key, limit, windowSeconds) {
  const redisKey = `ratelimit:${key}`;
  const current = await redisClient.incr(redisKey);
  if (current === 1) {
    await redisClient.expire(redisKey, windowSeconds);
  }
  return current <= limit;
}

module.exports = { checkRateLimit };
