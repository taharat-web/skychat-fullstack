const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Every socket connection must present the same short-lived access token
 * used for REST calls, via `socket.handshake.auth.token`. There is no
 * separate, longer-lived "socket token" - if the access token expires, the
 * client is expected to refresh over REST and reconnect with the new token.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    socket.username = payload.username;
    next();
  } catch (err) {
    logger.debug(`Socket auth failed: ${err.message}`);
    next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuthMiddleware;
