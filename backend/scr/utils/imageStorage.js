const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const env = require('../config/env');
const logger = require('./logger');

const AVATAR_DIR = path.join(process.cwd(), env.UPLOAD_DIR, 'avatars');

async function ensureAvatarDir() {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
}

/**
 * Re-encodes an uploaded avatar buffer to a fixed size WebP file with a
 * randomly generated name (never the client-supplied filename - that avoids
 * path traversal and information leakage, and re-encoding strips any
 * malicious payload hidden in image metadata/structure).
 *
 * @returns {Promise<string>} the public URL path, e.g. /uploads/avatars/xyz.webp
 */
async function saveAvatar(buffer) {
  await ensureAvatarDir();
  const filename = `${uuidv4()}.webp`;
  const filePath = path.join(AVATAR_DIR, filename);

  try {
    await sharp(buffer)
      .resize(512, 512, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(filePath);
  } catch (err) {
    logger.error(`Failed to process avatar image: ${err.message}`);
    throw err;
  }

  return `/uploads/avatars/${filename}`;
}

async function deleteAvatarIfLocal(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  const filePath = path.join(process.cwd(), avatarUrl.replace(/^\//, ''));
  try {
    await fs.unlink(filePath);
  } catch {
    // Non-fatal: the file may already be gone.
  }
}

module.exports = { saveAvatar, deleteAvatarIfLocal };
