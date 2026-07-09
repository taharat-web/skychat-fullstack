const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Access tokens are short-lived, stateless JWTs. They are NOT stored in the
 * database - by design there is nothing to revoke early (a compromised
 * access token expires within minutes). Long-lived sessions are controlled
 * entirely through the database-backed refresh token (see modules/auth).
 */
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };
