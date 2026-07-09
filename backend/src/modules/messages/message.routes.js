const express = require('express');
const { z } = require('zod');
const messageService = require('./message.service');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { emitToConversation } = require('../../utils/socketEmitter');

const router = express.Router();
router.use(authenticate);

const editSchema = z.object({ content: z.string().min(1).max(4000) });

router.patch(
  '/:id',
  validate({ body: editSchema }),
  asyncHandler(async (req, res) => {
    const message = await messageService.editMessage(req.user.id, req.params.id, req.body.content);
    emitToConversation(message.conversationId, 'message:updated', message);
    res.json({ message });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await messageService.deleteMessage(req.user.id, req.params.id);
    emitToConversation(result.conversationId, 'message:deleted', result);
    res.json(result);
  })
);

module.exports = router;
