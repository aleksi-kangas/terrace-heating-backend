import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';

const authRouter = new express.Router();

/**
 * Endpoint for user login.
 * Verifies the given credentials and returns a user object with JsonWebToken,
 * if the credentials were valid.
 * @return {Object} { token: String, username: String, name: String, id: String }
 */
authRouter.post('/login', async (request, response) => {
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

/**
 * Endpoint for user logout.
 * Removes the http-only cookie from response.
 * @return {Object} { token: String, username: String, name: String, id: String }
 */
authRouter.post('/logout', (request, response) => {
  request.session.destroy(() => {
    response.redirect('/');
  });
});

authRouter.get('/session', async (request, response) => {
  if (request.session.loggedIn) {
    const user = await User.findById(request.session.userId);
    return response.send({
      id: user.id,
      name: user.name,
      username: user.username,
    });
  }
  return response.status(401).end();
});

export default authRouter;
