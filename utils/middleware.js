import jwt from 'jsonwebtoken';

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

export const authorizeToken = async (request, response, next) => {
  const token = request.cookies.token || null;
  if (!token) {
    return response.status(401).end();
  }
  return jwt.verify(token, process.env.JWT, (error, decodedToken) => {
    if (error) {
      return response.status(401).end();
    }
    request.user = {
      id: decodedToken.id,
      username: decodedToken.username,
      name: decodedToken.name,
    };
    return next();
  });
};

/**
 * Responds to a request pointing to an unknown endpoint with status code 404.
 */
export const unknownEndpoint = (request, response) => response.status(404).json({ error: 'unknown endpoint' });
