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
  return next(error);
};

const unknownEndpoint = (request, response) => response.status(404).json({ error: 'unknown endpoint' });

export default {
  errorHandler,
  unknownEndpoint,
};
