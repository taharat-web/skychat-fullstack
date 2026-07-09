const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../config/db');

/**
 * Requires a valid `Authorization: Bearer <accessToken>` header. On success,
 * attaches `req.user = { id, username }`.
 *
 * We deliberately do NOT hit the database on every request just to check
 * `isActive` - the JWT's short expiry (15 min) bounds the blast radius of a
 * deactivated-but-not-yet-expired token, which is an acceptable trade-off for
 * performance. Endpoints that need a fully fresh user record load it
 * themselves.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  req.user = { id: payload.sub, username: payload.username };
  next();
});

/**
 * Loads the full, current user record and attaches it as req.currentUser.
 * Use for sensitive operations (password change, account status checks)
 * where a stale JWT claim isn't good enough.
 */
const loadCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is no longer active');
  }
  req.currentUser = user;
  next();
});

module.exports = { authenticate, loadCurrentUser };
