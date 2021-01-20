import express from 'express';
import User from '../models/user';

const sessionRouter = new express.Router();

/**
 * Endpoint for fetching session status.
 * Returns user data if session is valid.
 * @return {Object} { id: String, name: String, username: String }
 */
sessionRouter.get('/', async (request, response) => {
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

export default sessionRouter;
