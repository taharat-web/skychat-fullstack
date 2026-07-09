const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { serializeMessage, serializePublicUser } = require('../../utils/serializers');
const conversationService = require('../conversations/conversation.service');
const activityLog = require('../activityLog.service');
const ACTIONS = require('../../utils/activityActions');

async function buildConversationExport(conversationId) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      group: true,
      participants: { include: { user: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: true },
      },
    },
  });
  if (!convo) return null;

  return {
    conversationId: convo.id,
    type: convo.type,
    group: convo.group ? { name: convo.group.name, description: convo.group.description } : null,
    participants: convo.participants.map((p) => serializePublicUser(p.user)),
    messages: convo.messages.map(serializeMessage),
    exportedAt: new Date().toISOString(),
  };
}

async function exportAllForUser(userId) {
  const participantRows = await prisma.conversationParticipant.findMany({
    where: { userId, leftAt: null },
    select: { conversationId: true },
  });

  const conversations = await Promise.all(
    participantRows.map((row) => buildConversationExport(row.conversationId))
  );

  await activityLog.log(userId, ACTIONS.CHAT_EXPORTED, { targetType: 'USER', targetId: userId });

  return {
    exportedAt: new Date().toISOString(),
    conversationCount: conversations.length,
    conversations: conversations.filter(Boolean),
  };
}

async function exportSingleConversation(userId, conversationId) {
  await conversationService.requireActiveParticipant(conversationId, userId);
  const data = await buildConversationExport(conversationId);
  if (!data) throw ApiError.notFound('Conversation not found');

  await activityLog.log(userId, ACTIONS.CHAT_EXPORTED, {
    targetType: 'CONVERSATION',
    targetId: conversationId,
  });

  return data;
}

module.exports = { exportAllForUser, exportSingleConversation };
