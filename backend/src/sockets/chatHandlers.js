const messageService = require('../modules/messages/message.service');
const conversationService = require('../modules/conversations/conversation.service');
const { checkRateLimit } = require('../utils/rateLimiter');
const { conversationRoom } = require('../utils/socketEmitter');
const env = require('../config/env');
const logger = require('../utils/logger');

function registerChatHandlers(io, socket) {
  const userId = socket.userId;

  socket.on('conversation:join', async (payload, ack) => {
    try {
      const conversationId = payload?.conversationId;
      await conversationService.requireActiveParticipant(conversationId, userId);
      socket.join(conversationRoom(conversationId));
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('conversation:leave', (payload) => {
    const conversationId = payload?.conversationId;
    if (conversationId) socket.leave(conversationRoom(conversationId));
  });

  socket.on('message:send', async (payload, ack) => {
    try {
      const allowed = await checkRateLimit(
        `msg:${userId}`,
        env.MESSAGE_RATE_LIMIT_MAX,
        env.MESSAGE_RATE_LIMIT_WINDOW_SEC
      );
      if (!allowed) {
        return ack?.({ ok: false, error: 'You are sending messages too quickly' });
      }

      const message = await messageService.sendMessage(userId, payload?.conversationId, payload?.content);
      io.to(conversationRoom(payload.conversationId)).emit('message:new', message);
      ack?.({ ok: true, message, clientTempId: payload?.clientTempId });
    } catch (err) {
      logger.debug(`message:send failed: ${err.message}`);
      ack?.({ ok: false, error: err.message, clientTempId: payload?.clientTempId });
    }
  });

  socket.on('message:edit', async (payload, ack) => {
    try {
      const message = await messageService.editMessage(userId, payload?.messageId, payload?.content);
      io.to(conversationRoom(message.conversationId)).emit('message:updated', message);
      ack?.({ ok: true, message });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('message:delete', async (payload, ack) => {
    try {
      const result = await messageService.deleteMessage(userId, payload?.messageId);
      io.to(conversationRoom(result.conversationId)).emit('message:deleted', result);
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('message:seen', async (payload, ack) => {
    try {
      const conversationId = payload?.conversationId;
      const { messageIds } = await conversationService.markAsRead(userId, conversationId);
      io.to(conversationRoom(conversationId)).emit('message:status', {
        conversationId,
        messageIds,
        userId,
        status: 'SEEN',
      });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });
}

module.exports = registerChatHandlers;
