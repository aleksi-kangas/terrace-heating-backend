/**
 * Middleware for handling errors.
 */
export const errorHandler = (error, request, response, next) => {
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
 * Middleware for authorizing API requests.
 */
export const authorize = (request, response, next) => {
  if (!request.session.loggedIn) {
    return response.status(401).end();
  }
  return next();
};

/**
 * Responds to a request pointing to an unknown endpoint with status code 404.
 */
export const unknownEndpoint = (request, response) => response.status(404).json({ error: 'unknown endpoint' });
