const express = require('express');
const { z } = require('zod');
const conversationService = require('./conversation.service');
const messageService = require('../messages/message.service');
const groupService = require('../groups/group.service');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { messageLimiter } = require('../../middleware/rateLimit.middleware');
const { emitToConversation } = require('../../utils/socketEmitter');
const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const router = express.Router();
router.use(authenticate);

const listQuerySchema = z.object({ type: z.enum(['all', 'direct', 'group']).default('all') });
const createDirectSchema = z.object({ friendId: z.string().uuid() });
const messagesQuerySchema = z.object({ cursor: z.string().uuid().optional(), limit: z.coerce.number().int().min(1).max(100).optional() });
const sendMessageSchema = z.object({ content: z.string().min(1).max(4000) });

router.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const conversations = await conversationService.listConversations(req.user.id, req.query.type);
    res.json({ conversations });
  })
);

router.post(
  '/direct',
  validate({ body: createDirectSchema }),
  asyncHandler(async (req, res) => {
    const conversationId = await conversationService.getOrCreateDirectConversation(req.user.id, req.body.friendId);
    const detail = await conversationService.getConversationDetail(req.user.id, conversationId);
    res.status(201).json({ conversation: detail });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const detail = await conversationService.getConversationDetail(req.user.id, req.params.id);
    res.json({ conversation: detail });
  })
);

router.get(
  '/:id/messages',
  validate({ query: messagesQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await messageService.getMessages(req.user.id, req.params.id, req.query);
    res.json(result);
  })
);

// Primary send path is the `message:send` socket event (see
// sockets/chatHandlers.js) - this REST endpoint exists as a fallback for
// clients that can't hold a WebSocket open, and shares the same service
// function so behavior never diverges between the two paths.
router.post(
  '/:id/messages',
  messageLimiter,
  validate({ body: sendMessageSchema }),
  asyncHandler(async (req, res) => {
    const message = await messageService.sendMessage(req.user.id, req.params.id, req.body.content);
    emitToConversation(req.params.id, 'message:new', message);
    res.status(201).json({ message });
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const { messageIds } = await conversationService.markAsRead(req.user.id, req.params.id);
    emitToConversation(req.params.id, 'message:status', {
      conversationId: req.params.id,
      messageIds,
      userId: req.user.id,
      status: 'SEEN',
    });
    res.json({ message: 'Marked as read' });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!convo) throw ApiError.notFound('Conversation not found');

    if (convo.type === 'GROUP') {
      await groupService.leaveGroup(req.user.id, req.params.id);
    } else {
      await conversationService.hideDirectConversation(req.user.id, req.params.id);
    }
    res.json({ message: 'Conversation removed' });
  })
);

module.exports = router;
