const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Memory storage: files are validated and resized (see utils/imageStorage.js)
// before ever touching disk, and never written under their original name.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPEG, PNG or WebP images are allowed'));
  }
  cb(null, true);
};

const avatarUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_AVATAR_SIZE_MB * 1024 * 1024,
    files: 1,
  },
}).single('avatar');

module.exports = { avatarUpload };
