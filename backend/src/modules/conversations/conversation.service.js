const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { serializePublicUser, serializeMessage } = require('../../utils/serializers');
const friendService = require('../friends/friend.service');
const presence = require('../../sockets/presence');

/**
 * Loads the participant row for (conversationId, userId) if the user is a
 * current, non-left member. Used by messages/groups modules to authorize
 * every mutating action - never trust a role or membership claim from the
 * client.
 */
async function getActiveParticipant(conversationId, userId) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant || participant.leftAt) return null;
  return participant;
}

async function requireActiveParticipant(conversationId, userId) {
  const participant = await getActiveParticipant(conversationId, userId);
  if (!participant) throw ApiError.forbidden('You are not a member of this conversation');
  if (participant.isBanned) throw ApiError.forbidden('You have been banned from this conversation');
  return participant;
}

async function listConversations(userId, typeFilter = 'all') {
  const participantRows = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      leftAt: null,
      ...(typeFilter !== 'all' ? { conversation: { type: typeFilter.toUpperCase() } } : {}),
    },
    include: {
      conversation: {
        include: {
          group: true,
          participants: { where: { leftAt: null }, include: { user: true } },
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: true },
          },
        },
      },
    },
  });

  // Direct conversations the user has hidden (soft "deleted") stay out of the
  // list until a new message arrives - handled at query time since hiddenAt
  // is per-participant, not per-conversation.
  const visibleRows = participantRows.filter((row) => {
    if (row.conversation.type !== 'DIRECT') return true;
    if (!row.hiddenAt) return true;
    const lastMessage = row.conversation.messages[0];
    return lastMessage && lastMessage.createdAt > row.hiddenAt;
  });

  const otherUserIds = visibleRows
    .filter((r) => r.conversation.type === 'DIRECT')
    .map((r) => r.conversation.participants.find((p) => p.userId !== userId)?.userId)
    .filter(Boolean);
  const onlineIds = await presence.getOnlineUserIds(otherUserIds);

  const conversations = await Promise.all(
    visibleRows.map(async (row) => {
      const convo = row.conversation;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: convo.id,
          createdAt: { gt: row.lastReadAt },
          NOT: { senderId: userId },
        },
      });

      const lastMessage = convo.messages[0] ? serializeMessage(convo.messages[0]) : null;

      const base = {
        id: convo.id,
        type: convo.type,
        updatedAt: convo.updatedAt,
        lastMessageAt: convo.lastMessageAt,
        lastMessage,
        unreadCount,
        myRole: row.role,
      };

      if (convo.type === 'DIRECT') {
        const otherParticipant = convo.participants.find((p) => p.userId !== userId);
        return {
          ...base,
          peer: otherParticipant
            ? { ...serializePublicUser(otherParticipant.user), isOnline: onlineIds.has(otherParticipant.userId) }
            : null,
        };
      }

      return {
        ...base,
        group: {
          name: convo.group?.name,
          description: convo.group?.description,
          avatarUrl: convo.group?.avatarUrl,
          memberCount: convo.participants.length,
        },
      };
    })
  );

  conversations.sort((a, b) => {
    const aTime = a.lastMessageAt || a.updatedAt;
    const bTime = b.lastMessageAt || b.updatedAt;
    return new Date(bTime) - new Date(aTime);
  });

  return conversations;
}

async function getOrCreateDirectConversation(userId, friendId) {
  if (userId === friendId) throw ApiError.badRequest("You can't start a conversation with yourself");

  if (!(await friendService.areFriends(userId, friendId))) {
    throw ApiError.forbidden('You can only message friends. Send a friend request first.');
  }
  if (await friendService.isBlockedEitherWay(userId, friendId)) {
    throw ApiError.forbidden('You cannot message this user');
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: friendId } } },
      ],
    },
  });

  if (existing) {
    // Unhide it for the requesting user in case they'd previously hidden it.
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: existing.id, userId },
      data: { hiddenAt: null },
    });
    return existing.id;
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [{ userId }, { userId: friendId }],
      },
    },
  });

  return conversation.id;
}

async function getConversationDetail(userId, conversationId) {
  await requireActiveParticipant(conversationId, userId);

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      group: true,
      participants: { where: { leftAt: null }, include: { user: true } },
    },
  });
  if (!convo) throw ApiError.notFound('Conversation not found');

  if (convo.type === 'DIRECT') {
    const other = convo.participants.find((p) => p.userId !== userId);
    const isOnline = other ? await presence.isOnline(other.userId) : false;
    return {
      id: convo.id,
      type: convo.type,
      peer: other ? { ...serializePublicUser(other.user), isOnline } : null,
    };
  }

  return {
    id: convo.id,
    type: convo.type,
    group: {
      name: convo.group?.name,
      description: convo.group?.description,
      avatarUrl: convo.group?.avatarUrl,
      createdById: convo.group?.createdById,
    },
    members: convo.participants.map((p) => ({
      ...serializePublicUser(p.user),
      role: p.role,
      joinedAt: p.joinedAt,
    })),
  };
}

async function markAsRead(userId, conversationId) {
  await requireActiveParticipant(conversationId, userId);
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });

  // Flip any not-yet-seen messages from other senders to SEEN.
  const unseen = await prisma.message.findMany({
    where: { conversationId, NOT: { senderId: userId } },
    select: { id: true },
  });
  if (unseen.length > 0) {
    await prisma.messageStatus.updateMany({
      where: { userId, messageId: { in: unseen.map((m) => m.id) }, status: { not: 'SEEN' } },
      data: { status: 'SEEN' },
    });
  }

  return { messageIds: unseen.map((m) => m.id) };
}

async function hideDirectConversation(userId, conversationId) {
  const participant = await requireActiveParticipant(conversationId, userId);
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) throw ApiError.notFound('Conversation not found');
  if (convo.type !== 'DIRECT') {
    throw ApiError.badRequest('Use the leave-group endpoint for group conversations');
  }

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { hiddenAt: new Date() },
  });
}

module.exports = {
  getActiveParticipant,
  requireActiveParticipant,
  listConversations,
  getOrCreateDirectConversation,
  getConversationDetail,
  markAsRead,
  hideDirectConversation,
};
