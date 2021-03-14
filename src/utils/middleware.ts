import {
  Request, Response, NextFunction,
} from 'express';

type Error = {
  name?: string;
  message: string;
}

/**
 * Middleware for handling errors.
 */
export const errorHandler = (
  error: Error, request: Request, response: Response, next: NextFunction,
): Response | void => {
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
export const authorize = (
  request: Request, response: Response, next: NextFunction,
): Response | void => {
  if (!request.session.user) {
    return response.status(401).end();
  }
  return next();
};

/**
 * Responds to a request pointing to an unknown endpoint with status code 404.
 */
export const unknownEndpoint = (
  request: Request, response: Response,
): Response => response.status(404).json({ error: 'unknown endpoint' });
