// Wraps an async Express handler so thrown errors / rejected promises are
// forwarded to next(err) instead of crashing the process.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
