const express = require('express');
const { z } = require('zod');
const friendService = require('./friend.service');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();
router.use(authenticate);

const sendRequestSchema = z.object({ receiverId: z.string().uuid() });
const listQuerySchema = z.object({ type: z.enum(['incoming', 'outgoing']).default('incoming') });

router.post(
  '/requests',
  validate({ body: sendRequestSchema }),
  asyncHandler(async (req, res) => {
    const request = await friendService.sendRequest(req.user.id, req.body.receiverId);
    res.status(201).json({ id: request.id, status: request.status, createdAt: request.createdAt });
  })
);

router.get(
  '/requests',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const requests = await friendService.listRequests(req.user.id, req.query.type);
    res.json({ requests });
  })
);

router.post(
  '/requests/:id/accept',
  asyncHandler(async (req, res) => {
    const result = await friendService.respondToRequest(req.params.id, req.user.id, 'accept');
    res.json(result);
  })
);

router.post(
  '/requests/:id/reject',
  asyncHandler(async (req, res) => {
    const result = await friendService.respondToRequest(req.params.id, req.user.id, 'reject');
    res.json(result);
  })
);

router.delete(
  '/requests/:id',
  asyncHandler(async (req, res) => {
    await friendService.cancelRequest(req.params.id, req.user.id);
    res.json({ message: 'Friend request cancelled' });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const friends = await friendService.listFriends(req.user.id);
    res.json({ friends });
  })
);

router.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    await friendService.removeFriend(req.user.id, req.params.userId);
    res.json({ message: 'Friend removed' });
  })
);

module.exports = router;
