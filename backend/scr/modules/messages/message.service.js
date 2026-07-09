const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { serializeMessage } = require('../../utils/serializers');
const conversationService = require('../conversations/conversation.service');
const presence = require('../../sockets/presence');
const permissions = require('../../utils/groupPermissions');
const notificationService = require('../notifications/notification.service');
const activityLog = require('../activityLog.service');
const ACTIONS = require('../../utils/activityActions');
const { emitToUser } = require('../../utils/socketEmitter');

const MAX_MESSAGE_LENGTH = 4000;

async function sendMessage(userId, conversationId, content) {
  const trimmed = content.trim();
  if (!trimmed) throw ApiError.badRequest('Message cannot be empty');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw ApiError.badRequest('Message is too long');

  const sender = await conversationService.requireActiveParticipant(conversationId, userId);
  if (sender.isBanned) throw ApiError.forbidden('You have been banned from this conversation');

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, leftAt: null, NOT: { userId } },
  });

  const onlineIds = await presence.getOnlineUserIds(otherParticipants.map((p) => p.userId));

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: trimmed,
        statuses: {
          create: otherParticipants.map((p) => ({
            userId: p.userId,
            status: onlineIds.has(p.userId) ? 'DELIVERED' : 'SENT',
          })),
        },
      },
      include: { sender: true, statuses: true },
    });

    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } });

    // A new message un-hides a direct conversation the recipient had hidden.
    await tx.conversationParticipant.updateMany({
      where: { conversationId, NOT: { userId }, hiddenAt: { not: null } },
      data: { hiddenAt: null },
    });

    return created;
  });

  // Notify participants who are not currently online (i.e. couldn't have
  // seen it arrive live). Online users get the live socket broadcast instead.
  const offlineRecipients = otherParticipants.filter((p) => !onlineIds.has(p.userId));
  for (const recipient of offlineRecipients) {
    const notification = await notificationService.create(recipient.userId, 'NEW_MESSAGE', {
      conversationId,
      messageId: message.id,
      preview: trimmed.slice(0, 120),
    });
    emitToUser(recipient.userId, 'notification:new', notification);
  }

  return serializeMessage(message);
}

async function editMessage(userId, messageId, newContent) {
  const trimmed = newContent.trim();
  if (!trimmed) throw ApiError.badRequest('Message cannot be empty');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw ApiError.badRequest('Message is too long');

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.isDeleted) throw ApiError.notFound('Message not found');
  if (message.senderId !== userId) throw ApiError.forbidden('You can only edit your own messages');

  await conversationService.requireActiveParticipant(message.conversationId, userId);

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: trimmed, isEdited: true },
    include: { sender: true, statuses: true },
  });

  return serializeMessage(updated);
}

async function deleteMessage(userId, messageId) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.isDeleted) throw ApiError.notFound('Message not found');

  const participant = await conversationService.requireActiveParticipant(message.conversationId, userId);

  const isOwn = message.senderId === userId;
  const canModerate = permissions.canDeleteOthersMessage(participant.role);
  if (!isOwn && !canModerate) {
    throw ApiError.forbidden('You do not have permission to delete this message');
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedById: userId, content: '' },
  });

  if (!isOwn) {
    await activityLog.log(userId, ACTIONS.MESSAGE_DELETED_BY_MODERATOR, {
      targetType: 'GROUP',
      targetId: message.conversationId,
      metadata: { messageId, originalSenderId: message.senderId },
    });
  }

  return { conversationId: message.conversationId, messageId };
}

async function getMessages(userId, conversationId, { cursor, limit = 40 } = {}) {
  await conversationService.requireActiveParticipant(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { sender: true, statuses: true },
  });

  const hasMore = messages.length > limit;
  const page = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: page.map(serializeMessage).reverse(),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

module.exports = { sendMessage, editMessage, deleteMessage, getMessages, MAX_MESSAGE_LENGTH };
