const prisma = require('../config/db');

/**
 * Records one audit trail entry. Intentionally swallows its own errors
 * (logged, not thrown) for non-critical call sites so that a logging hiccup
 * never breaks the user-facing action it's describing. Callers that need
 * the write to be part of an atomic transaction should use
 * `prisma.activityLog.create` directly inside that transaction instead.
 */
async function log(actorId, action, { targetType, targetId, metadata } = {}) {
  try {
    await prisma.activityLog.create({
      data: { actorId, action, targetType, targetId, metadata },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write activity log entry:', err.message);
  }
}

async function listForUser(userId, { cursor, limit = 30 } = {}) {
  const entries = await prisma.activityLog.findMany({
    where: { actorId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > limit;
  const page = hasMore ? entries.slice(0, limit) : entries;
  return { entries: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

// Group-scoped activity log. Caller is responsible for checking the
// requesting user is an admin/moderator of the group before calling this.
async function listForGroup(conversationId, { cursor, limit = 30 } = {}) {
  const entries = await prisma.activityLog.findMany({
    where: { targetType: 'GROUP', targetId: conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: { id: true, username: true, avatarUrl: true } } },
  });

  const hasMore = entries.length > limit;
  const page = hasMore ? entries.slice(0, limit) : entries;
  return { entries: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

module.exports = { log, listForUser, listForGroup };
