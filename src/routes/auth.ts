import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import { Credentials } from '../types';

const authRouter = express.Router();

/**
 * Endpoint for user login.
 * Verifies the given credentials and registers the session.
 * Returns user information.
 * @return UserType || null
 */
authRouter.post('/login', async (request: Request, response: Response) => {
  const credentials: Credentials = {
    username: request.body.username,
    password: request.body.password,
  };

  const user = await User.findOne({ username: credentials.username });
  if (!user) {
    return response.status(401).json({ error: 'invalid username or password' });
  }
  // Compare password
  const correctPassword = bcrypt.compareSync(credentials.password, user.passwordHash);

  // Password is wrong
  if (!correctPassword) {
    return response.status(401).json({ error: 'invalid username or password' });
  }

  // Add user to the session property
  request.session.user = user.id;

  return response
    .status(200)
    .send({
      id: user.id,
      username: user.username,
      name: user.name,
    });
});

/**
 * Endpoint for user logout. Destroys the session.
 */
authRouter.post('/logout', (request: Request, response: Response) => {
  request.session.destroy(() => {
    response.redirect('/');
  });
});

/**
 * Endpoint for fetching session status.
 * Returns user information if session (HTTP-only cookie) is valid.
 * @return UserType
 */
authRouter.get('/session', async (request: Request, response: Response) => {
  if (request.session.user) {
    const userObject = await User.findById(request.session.user);
    return response.send({
      id: userObject.id,
      name: userObject.name,
      username: userObject.username,
    });
  }
  return response.status(401).json({ error: 'Session is invalid' });
});

export default authRouter;
