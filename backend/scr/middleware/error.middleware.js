const multer = require('multer');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// Must be registered LAST, after all routes, and take 4 args so Express
// recognizes it as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'File upload error';
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    message = 'That value is already in use';
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Invalid request data';
    details = err.flatten?.().fieldErrors;
  }

  // Anything unexpected (statusCode 500) is logged with full detail
  // server-side but NEVER returned to the client - avoids leaking stack
  // traces, file paths, or query text.
  if (statusCode >= 500) {
    logger.error(`${err.name || 'Error'}: ${err.message}\n${err.stack}`);
  } else if (!env.IS_PRODUCTION) {
    logger.debug(`${statusCode} ${message}`);
  }

  const body = { error: { message } };
  if (details) body.error.details = details;
  if (!env.IS_PRODUCTION && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
