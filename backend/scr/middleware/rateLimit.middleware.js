const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function buildStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

const rateLimitHandler = (req, res, next) => {
  next(ApiError.tooManyRequests('Too many requests. Please try again later.'));
};

// Applied to login/signup/forgot-password/reset-password - the endpoints
// most attractive to credential-stuffing and brute-force attacks.
const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('auth'),
  handler: rateLimitHandler,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || ''}`,
});

// Applied to the REST message-send fallback endpoint. Socket.IO message
// sends are rate-limited separately (see sockets/chatHandlers.js) since this
// middleware only runs on HTTP requests.
const messageLimiter = rateLimit({
  windowMs: env.MESSAGE_RATE_LIMIT_WINDOW_SEC * 1000,
  max: env.MESSAGE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('msg'),
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// General-purpose, generous limiter applied to the whole API as a backstop.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('global'),
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = { authLimiter, messageLimiter, globalLimiter };
