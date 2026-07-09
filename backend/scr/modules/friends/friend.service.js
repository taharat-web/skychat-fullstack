const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { serializePublicUser } = require('../../utils/serializers');
const { emitToUser } = require('../../utils/socketEmitter');
const notificationService = require('../notifications/notification.service');
const activityLog = require('../activityLog.service');
const ACTIONS = require('../../utils/activityActions');

// Friendship rows are stored with a stable pair ordering so (A, B) and (B, A)
// always map to the same unique row.
function orderPair(userAId, userBId) {
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

async function areFriends(userAId, userBId) {
  const [a, b] = orderPair(userAId, userBId);
  const row = await prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  return Boolean(row);
}

async function isBlockedEitherWay(userAId, userBId) {
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
  });
  return Boolean(row);
}

async function sendRequest(senderId, receiverId) {
  if (senderId === receiverId) throw ApiError.badRequest("You can't send a friend request to yourself");

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) throw ApiError.notFound('User not found');

  if (await isBlockedEitherWay(senderId, receiverId)) {
    throw ApiError.forbidden('You cannot send a friend request to this user');
  }
  if (await areFriends(senderId, receiverId)) {
    throw ApiError.conflict('You are already friends with this user');
  }

  const existing = await prisma.friendRequest.findFirst({
    where: {
      status: 'PENDING',
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });
  if (existing) {
    throw ApiError.conflict('A friend request is already pending between you and this user');
  }

  const request = await prisma.friendRequest.create({
    data: { senderId, receiverId, status: 'PENDING' },
    include: { sender: true },
  });

  await activityLog.log(senderId, ACTIONS.FRIEND_REQUEST_SENT, {
    targetType: 'USER',
    targetId: receiverId,
  });

  const notification = await notificationService.create(receiverId, 'FRIEND_REQUEST_RECEIVED', {
    requestId: request.id,
    fromUser: serializePublicUser(request.sender),
  });
  emitToUser(receiverId, 'friend_request:new', {
    id: request.id,
    from: serializePublicUser(request.sender),
    createdAt: request.createdAt,
  });
  emitToUser(receiverId, 'notification:new', notification);

  return request;
}

async function listRequests(userId, type) {
  const where =
    type === 'outgoing' ? { senderId: userId, status: 'PENDING' } : { receiverId: userId, status: 'PENDING' };

  const requests = await prisma.friendRequest.findMany({
    where,
    include: { sender: true, receiver: true },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    sender: serializePublicUser(r.sender),
    receiver: serializePublicUser(r.receiver),
  }));
}

async function respondToRequest(requestId, userId, action) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request || request.receiverId !== userId) throw ApiError.notFound('Friend request not found');
  if (request.status !== 'PENDING') throw ApiError.conflict('This request has already been handled');

  if (action === 'accept') {
    const [a, b] = orderPair(request.senderId, request.receiverId);
    await prisma.$transaction([
      prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
      prisma.friendship.create({ data: { userAId: a, userBId: b } }),
    ]);

    await activityLog.log(userId, ACTIONS.FRIEND_REQUEST_ACCEPTED, {
      targetType: 'USER',
      targetId: request.senderId,
    });

    const accepter = await prisma.user.findUnique({ where: { id: userId } });
    const notification = await notificationService.create(request.senderId, 'FRIEND_REQUEST_ACCEPTED', {
      byUser: serializePublicUser(accepter),
    });
    emitToUser(request.senderId, 'friend_request:accepted', { by: serializePublicUser(accepter) });
    emitToUser(request.senderId, 'notification:new', notification);
  } else {
    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    await activityLog.log(userId, ACTIONS.FRIEND_REQUEST_REJECTED, {
      targetType: 'USER',
      targetId: request.senderId,
    });
  }

  return { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' };
}

async function cancelRequest(requestId, userId) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request || request.senderId !== userId) throw ApiError.notFound('Friend request not found');
  if (request.status !== 'PENDING') throw ApiError.conflict('This request has already been handled');

  await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
  await activityLog.log(userId, ACTIONS.FRIEND_REQUEST_CANCELLED, {
    targetType: 'USER',
    targetId: request.receiverId,
  });
}

async function listFriends(userId) {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: true, userB: true },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => {
    const friend = row.userAId === userId ? row.userB : row.userA;
    return { ...serializePublicUser(friend), friendsSince: row.createdAt };
  });
}

async function removeFriend(userId, friendId) {
  const [a, b] = orderPair(userId, friendId);
  const row = await prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  if (!row) throw ApiError.notFound('You are not friends with this user');

  await prisma.friendship.delete({ where: { id: row.id } });
  await activityLog.log(userId, ACTIONS.FRIEND_REMOVED, { targetType: 'USER', targetId: friendId });
}

async function blockUser(userId, targetId) {
  if (userId === targetId) throw ApiError.badRequest("You can't block yourself");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw ApiError.notFound('User not found');

  const [a, b] = orderPair(userId, targetId);

  await prisma.$transaction(async (tx) => {
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      update: {},
      create: { blockerId: userId, blockedId: targetId },
    });
    await tx.friendship.deleteMany({ where: { userAId: a, userBId: b } });
    await tx.friendRequest.updateMany({
      where: {
        status: 'PENDING',
        OR: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      },
      data: { status: 'CANCELLED' },
    });
  });

  await activityLog.log(userId, ACTIONS.USER_BLOCKED, { targetType: 'USER', targetId });
}

async function unblockUser(userId, targetId) {
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
  await activityLog.log(userId, ACTIONS.USER_UNBLOCKED, { targetType: 'USER', targetId });
}

async function listBlocked(userId) {
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => serializePublicUser(r.blocked));
}

module.exports = {
  areFriends,
  isBlockedEitherWay,
  sendRequest,
  listRequests,
  respondToRequest,
  cancelRequest,
  listFriends,
  removeFriend,
  blockUser,
  unblockUser,
  listBlocked,
};
