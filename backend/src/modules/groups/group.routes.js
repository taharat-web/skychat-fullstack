const express = require('express');
const { z } = require('zod');
const groupService = require('./group.service');
const conversationService = require('../conversations/conversation.service');
const activityLog = require('../activityLog.service');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { avatarUpload } = require('../../middleware/upload.middleware');
const ApiError = require('../../utils/ApiError');

const router = express.Router();
router.use(authenticate);

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().uuid()).max(249).optional().default([]),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

const addMemberSchema = z.object({ userId: z.string().uuid() });
const changeRoleSchema = z.object({ role: z.enum(['MODERATOR', 'MEMBER']) });
const activityLogQuerySchema = z.object({ cursor: z.string().uuid().optional() });

router.post(
  '/',
  validate({ body: createGroupSchema }),
  asyncHandler(async (req, res) => {
    const conversationId = await groupService.createGroup(req.user.id, req.body);
    const detail = await conversationService.getConversationDetail(req.user.id, conversationId);
    res.status(201).json({ conversation: detail });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const detail = await conversationService.getConversationDetail(req.user.id, req.params.id);
    if (detail.type !== 'GROUP') throw ApiError.notFound('Group not found');
    res.json({ conversation: detail });
  })
);

router.patch(
  '/:id',
  validate({ body: updateGroupSchema }),
  asyncHandler(async (req, res) => {
    const group = await groupService.updateGroup(req.user.id, req.params.id, req.body);
    res.json({ group });
  })
);

router.post(
  '/:id/avatar',
  (req, res, next) => avatarUpload(req, res, (err) => (err ? next(err) : next())),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image file provided');
    const avatarUrl = await groupService.updateGroupAvatar(req.user.id, req.params.id, req.file.buffer);
    res.json({ avatarUrl });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await groupService.deleteGroup(req.user.id, req.params.id);
    res.json({ message: 'Group deleted' });
  })
);

router.get(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const members = await groupService.listMembers(req.user.id, req.params.id);
    res.json({ members });
  })
);

router.post(
  '/:id/members',
  validate({ body: addMemberSchema }),
  asyncHandler(async (req, res) => {
    await groupService.addMember(req.user.id, req.params.id, req.body.userId);
    res.status(201).json({ message: 'Member added' });
  })
);

router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    await groupService.removeMember(req.user.id, req.params.id, req.params.userId, { ban: false });
    res.json({ message: 'Member removed' });
  })
);

router.post(
  '/:id/members/:userId/ban',
  asyncHandler(async (req, res) => {
    await groupService.removeMember(req.user.id, req.params.id, req.params.userId, { ban: true });
    res.json({ message: 'Member banned' });
  })
);

router.delete(
  '/:id/members/:userId/ban',
  asyncHandler(async (req, res) => {
    await groupService.unbanMember(req.user.id, req.params.id, req.params.userId);
    res.json({ message: 'Member unbanned' });
  })
);

router.patch(
  '/:id/members/:userId/role',
  validate({ body: changeRoleSchema }),
  asyncHandler(async (req, res) => {
    await groupService.changeRole(req.user.id, req.params.id, req.params.userId, req.body.role);
    res.json({ message: 'Role updated' });
  })
);

router.get(
  '/:id/activity-log',
  validate({ query: activityLogQuerySchema }),
  asyncHandler(async (req, res) => {
    const participant = await conversationService.requireActiveParticipant(req.params.id, req.user.id);
    if (participant.role === 'MEMBER') {
      throw ApiError.forbidden('Only group admins and moderators can view the activity log');
    }
    const result = await activityLog.listForGroup(req.params.id, req.query);
    res.json(result);
  })
);

module.exports = router;
