const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function create(userId, type, payload) {
  const notification = await prisma.notification.create({
    data: { userId, type, payload },
  });
  return notification;
}

async function list(userId, { unreadOnly = false, cursor, limit = 30 } = {}) {
  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

  return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null, unreadCount };
}

async function markRead(userId, notificationId) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) throw ApiError.notFound('Notification not found');

  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

module.exports = { create, list, markRead, markAllRead };
