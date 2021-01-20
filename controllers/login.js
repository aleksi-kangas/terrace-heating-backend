import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';

const loginRouter = new express.Router();

/**
 * Endpoint for user login.
 * Verifies the given credentials and returns a user object with JsonWebToken,
 * if the credentials were valid.
 * @return {Object} { token: String, username: String, name: String, id: String }
 */
loginRouter.post('/', async (request, response) => {
  const credentials = {
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

  // Mutate session
  request.session.loggedIn = true;
  request.session.userId = user.id;

  return response
    .status(200)
    .send({
      id: user.id,
      username: user.username,
      name: user.name,
    });
});

export default loginRouter;
