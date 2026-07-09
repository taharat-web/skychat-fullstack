const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { serializeUser, serializePublicUser } = require('../../utils/serializers');
const { saveAvatar, deleteAvatarIfLocal } = require('../../utils/imageStorage');
const friendService = require('../friends/friend.service');
const activityLog = require('../activityLog.service');
const ACTIONS = require('../../utils/activityActions');

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  return serializeUser(user);
}

async function updateProfile(userId, updates) {
  if (updates.username) {
    const clash = await prisma.user.findFirst({
      where: { username: updates.username, NOT: { id: userId } },
    });
    if (clash) throw ApiError.conflict('That username is taken');
  }

  const user = await prisma.user.update({ where: { id: userId }, data: updates });
  await activityLog.log(userId, ACTIONS.PROFILE_UPDATED, { targetType: 'USER', targetId: userId, metadata: updates });
  return serializeUser(user);
}

async function updateAvatar(userId, fileBuffer) {
  const current = await prisma.user.findUnique({ where: { id: userId } });
  const avatarUrl = await saveAvatar(fileBuffer);
  const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

  await deleteAvatarIfLocal(current?.avatarUrl);
  await activityLog.log(userId, ACTIONS.AVATAR_UPDATED, { targetType: 'USER', targetId: userId });

  return serializeUser(user);
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Changing your password invalidates every other logged-in session.
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ]);

  await activityLog.log(userId, ACTIONS.AUTH_PASSWORD_CHANGED, { targetType: 'USER', targetId: userId });
}

async function searchUsers(requestingUserId, query) {
  if (!query || query.trim().length < 2) return [];

  const candidates = await prisma.user.findMany({
    where: {
      NOT: { id: requestingUserId },
      isActive: true,
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { email: { equals: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { username: 'asc' },
  });

  if (candidates.length === 0) return [];

  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: requestingUserId, blockedId: { in: candidates.map((c) => c.id) } },
        { blockedId: requestingUserId, blockerId: { in: candidates.map((c) => c.id) } },
      ],
    },
  });
  const hiddenIds = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));

  return candidates.filter((c) => !hiddenIds.has(c.id)).map(serializePublicUser);
}

async function getPublicProfile(requestingUserId, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || !target.isActive) throw ApiError.notFound('User not found');

  if (await friendService.isBlockedEitherWay(requestingUserId, targetId)) {
    throw ApiError.notFound('User not found');
  }

  return serializePublicUser(target);
}

module.exports = {
  getMe,
  updateProfile,
  updateAvatar,
  changePassword,
  searchUsers,
  getPublicProfile,
};
