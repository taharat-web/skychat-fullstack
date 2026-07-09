const express = require('express');
const { z } = require('zod');
const userService = require('./user.service');
const friendService = require('../friends/friend.service');
const activityLog = require('../activityLog.service');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { avatarUpload } = require('../../middleware/upload.middleware');
const ApiError = require('../../utils/ApiError');

const router = express.Router();
router.use(authenticate);

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .optional(),
  bio: z.string().max(280).optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
});

const searchQuerySchema = z.object({ q: z.string().min(1).max(50) });
const activityLogQuerySchema = z.object({ cursor: z.string().uuid().optional() });

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await userService.getMe(req.user.id);
    res.json({ user });
  })
);

router.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ user });
  })
);

router.post(
  '/me/avatar',
  (req, res, next) => avatarUpload(req, res, (err) => (err ? next(err) : next())),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image file provided');
    const user = await userService.updateAvatar(req.user.id, req.file.buffer);
    res.json({ user });
  })
);

router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await userService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password updated' });
  })
);

router.get(
  '/me/activity-log',
  validate({ query: activityLogQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await activityLog.listForUser(req.user.id, req.query);
    res.json(result);
  })
);

router.get(
  '/search',
  validate({ query: searchQuerySchema }),
  asyncHandler(async (req, res) => {
    const users = await userService.searchUsers(req.user.id, req.query.q);
    res.json({ users });
  })
);

router.get(
  '/blocked',
  asyncHandler(async (req, res) => {
    const users = await friendService.listBlocked(req.user.id);
    res.json({ users });
  })
);

router.post(
  '/:id/block',
  asyncHandler(async (req, res) => {
    await friendService.blockUser(req.user.id, req.params.id);
    res.json({ message: 'User blocked' });
  })
);

router.delete(
  '/:id/block',
  asyncHandler(async (req, res) => {
    await friendService.unblockUser(req.user.id, req.params.id);
    res.json({ message: 'User unblocked' });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.getPublicProfile(req.user.id, req.params.id);
    res.json({ user });
  })
);

module.exports = router;
