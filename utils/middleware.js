/**
 * Middleware for handling errors.
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

/**
 * Extracts authorization token out of the request header and places it in token-property.
 */
const authTokenExtractor = (request, response, next) => {
  const authHeader = request.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    request.token = authHeader.substring(7);
  }
  next();
};

/**
 * Responds to a request pointing to an unknown endpoint with status code 404.
 */
const unknownEndpoint = (request, response) => response.status(404).json({ error: 'unknown endpoint' });

export default {
  authTokenExtractor,
  errorHandler,
  unknownEndpoint,
};
