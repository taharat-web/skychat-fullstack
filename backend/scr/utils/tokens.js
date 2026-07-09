const crypto = require('crypto');

/**
 * Generates a random opaque token and its SHA-256 hash.
 * The RAW token is what gets emailed / set as a cookie; only the HASH is
 * ever persisted. This means a stolen database dump alone can't be used to
 * impersonate a user or verify an email, because the raw token can't be
 * recovered from the hash.
 */
function generateOpaqueToken(bytes = 32) {
  const raw = crypto.randomBytes(bytes).toString('hex');
  const hash = hashToken(raw);
  return { raw, hash };
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { generateOpaqueToken, hashToken };
