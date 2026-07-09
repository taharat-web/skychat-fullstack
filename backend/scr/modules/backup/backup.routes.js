const express = require('express');
const backupService = require('./backup.service');
const { authenticate } = require('../../middleware/auth.middleware');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();
router.use(authenticate);

function sendAsDownload(res, filename, data) {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
}

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const data = await backupService.exportAllForUser(req.user.id);
    sendAsDownload(res, `skychat-backup-${Date.now()}.json`, data);
  })
);

router.get(
  '/export/:conversationId',
  asyncHandler(async (req, res) => {
    const data = await backupService.exportSingleConversation(req.user.id, req.params.conversationId);
    sendAsDownload(res, `skychat-conversation-${req.params.conversationId}.json`, data);
  })
);

module.exports = router;
