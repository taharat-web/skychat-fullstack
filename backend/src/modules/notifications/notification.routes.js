const express = require('express');
const { z } = require('zod');
const notificationService = require('./notification.service');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();
router.use(authenticate);

const listQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  cursor: z.string().uuid().optional(),
});

router.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await notificationService.list(req.user.id, req.query);
    res.json(result);
  })
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await notificationService.markRead(req.user.id, req.params.id);
    res.json({ message: 'Notification marked as read' });
  })
);

module.exports = router;
