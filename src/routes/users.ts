import express, { Request, Response } from 'express';
import userService from '../services/userService';
import { UserDocument } from '../models/user';

const userRouter = express.Router();

/**
 * Endpoint for fetching all users.
 * @return UserType[] containing all user objects present in the database
 */
userRouter.get('/', async (request: Request, response: Response) => {
  const users: UserDocument[] = await userService.getAll();
  return response.json(users);
});

/**
 * Endpoint for creating a user.
 * @return UserType created user
 */
userRouter.post('/', async (request: Request, response: Response) => {
  const { username, name, password } = request.body;
  const user = userService.create(username, name, password);
  return response.json(user);
});

export default userRouter;
