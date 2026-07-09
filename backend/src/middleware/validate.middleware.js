const ApiError = require('../utils/ApiError');

/**
 * Builds middleware that validates req.body/query/params against zod
 * schemas and replaces them with the parsed (and therefore trusted, coerced)
 * values. Failing validation returns 400 with field-level detail instead of
 * ever reaching a service function with malformed input.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return next(ApiError.badRequest('Invalid request data', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}

module.exports = validate;
