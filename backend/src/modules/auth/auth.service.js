const prisma = require('../../config/db');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { generateOpaqueToken, hashToken } = require('../../utils/tokens');
const { signAccessToken } = require('../../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');
const { serializeUser } = require('../../utils/serializers');
const activityLog = require('../activityLog.service');
const ACTIONS = require('../../utils/activityActions');

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

async function signup({ username, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    throw ApiError.conflict(
      existing.email === email ? 'That email is already registered' : 'That username is taken'
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, email, passwordHash },
  });

  await issueEmailVerificationToken(user);
  await activityLog.log(user.id, ACTIONS.AUTH_SIGNUP, { targetType: 'USER', targetId: user.id });

  return serializeUser(user);
}

async function issueEmailVerificationToken(user) {
  const { raw, hash } = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  try {
    await sendVerificationEmail(user, raw);
  } catch (error) {
    try {
    await sendVerificationEmail(user, raw);
  } catch (error) {
    throw new ApiError(500, "Google Error: " + error.message);
    }
  }
}

async function resendVerification(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  if (!user || user.isEmailVerified) return;
  await issueEmailVerificationToken(user);
}

async function verifyEmail(rawToken) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.expiresAt < new Date()) {
    throw ApiError.badRequest('This verification link is invalid or has expired');
  }

  const user = await prisma.user.update({
    where: { id: record.userId },
    data: { isEmailVerified: true },
  });

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await activityLog.log(user.id, ACTIONS.AUTH_EMAIL_VERIFIED, { targetType: 'USER', targetId: user.id });

  return serializeUser(user);
}

async function login({ email, password }, userAgent) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email doesn't exist or the password is
  // wrong - don't help an attacker enumerate accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email address before logging in');
  }

  const accessToken = signAccessToken(user);
  const { rawRefreshToken, expiresAt } = await issueRefreshToken(user.id, userAgent);

  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  await activityLog.log(user.id, ACTIONS.AUTH_LOGIN, { targetType: 'USER', targetId: user.id });

  return { user: serializeUser(user), accessToken, rawRefreshToken, refreshExpiresAt: expiresAt };
}

async function issueRefreshToken(userId, userAgent) {
  const { raw, hash } = generateOpaqueToken(40);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt, userAgent: userAgent?.slice(0, 255) },
  });

  return { rawRefreshToken: raw, expiresAt };
}

/**
 * Refresh token rotation: every use invalidates the old token and issues a
 * new one. If a token that's already marked `revoked` is presented again,
 * that's a signal it may have been stolen and replayed, so we revoke the
 * entire token family (every refresh token for that user) as a precaution.
 */
async function refreshSession(rawRefreshToken, userAgent) {
  if (!rawRefreshToken) throw ApiError.unauthorized('Missing refresh token');

  const tokenHash = hashToken(rawRefreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record) throw ApiError.unauthorized('Invalid session');

  if (record.revoked) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    });
    throw ApiError.unauthorized('Session invalid - please log in again');
  }

  if (record.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired - please log in again');
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is no longer active');

  const { raw: newRaw, hash: newHash } = generateOpaqueToken(40);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true, replacedBy: newHash },
    }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: newHash, expiresAt, userAgent: userAgent?.slice(0, 255) },
    }),
  ]);

  const accessToken = signAccessToken(user);
  return { user: serializeUser(user), accessToken, rawRefreshToken: newRaw, refreshExpiresAt: expiresAt };
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  }).catch(() => {});
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same response either way - don't leak whether the email is registered.
  if (!user) return;

  const { raw, hash } = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });
  await sendPasswordResetEmail(user, raw);
  await activityLog.log(user.id, ACTIONS.AUTH_PASSWORD_RESET_REQUESTED, {
    targetType: 'USER',
    targetId: user.id,
  });
}

async function resetPassword(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw ApiError.badRequest('This password reset link is invalid or has expired');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    // Resetting the password invalidates every existing session - if an
    // attacker had a stolen refresh token, this cuts it off.
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
  ]);

  await activityLog.log(record.userId, ACTIONS.AUTH_PASSWORD_RESET_COMPLETED, {
    targetType: 'USER',
    targetId: record.userId,
  });
}

module.exports = {
  signup,
  verifyEmail,
  resendVerification,
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
};
