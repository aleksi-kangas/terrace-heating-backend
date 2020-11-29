/**
 * Middleware for handling errors.
 * @param error
 * @param request
 * @param response
 * @param next
 * @return {any}
 */

const errorHandler = (error, request, response, next) => {
  if (error.name === 'ValidationError') {
    return response
      .status(400)
      .json({ error: error.message });
  }
  if (error.name === 'JsonWebTokenError') {
    return response
      .status(401)
      .json({ error: error.message });
  }
  return next(error);
};

const authTokenExtractor = (request, response, next) => {
  const authHeader = request.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    request.token = authHeader.substring(7);
  }
  next();
};

const unknownEndpoint = (request, response) => response.status(404).json({ error: 'unknown endpoint' });

export default {
  authTokenExtractor,
  errorHandler,
  unknownEndpoint,
};
