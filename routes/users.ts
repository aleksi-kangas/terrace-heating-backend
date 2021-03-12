import * as express from 'express';
import userService from '../services/userService';

const userRouter = express.Router();

/**
 * Endpoint for fetching all users.
 * @return {Array<Object>} users - containing all user objects present in the database
 */
userRouter.get('/', async (request, response) => {
  const users = await userService.getAll();
  return response.json(users);
});

/**
 * Endpoint for creating a user.
 * @return {Object} user - user saved to the database
 */
userRouter.post('/', async (request, response) => {
  const { username, name, password } = request.body;
  const user = userService.create(username, name, password);
  return response.json(user);
});

export default userRouter;
