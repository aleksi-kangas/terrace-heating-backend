import express from 'express';
import userService from '../services/userService.js';

const userRouter = new express.Router();

/**
 * Endpoint for fetching all users.
 * @return {Array<Object>} users
 */
userRouter.get('/', async (request, response) => {
  const users = await userService.getAll();
  return response.json(users);
});

/**
 * Endpoint for creating a user.
 * @return {Object} user
 */
userRouter.post('/', async (request, response, next) => {
  const { username, password } = request.body;
  try {
    const user = userService.create(username, password);
    return response.json(user);
  } catch (exception) {
    return next(exception);
  }
});
