import express from 'express';

const logoutRouter = new express.Router();

/**
 * Endpoint for user logout.
 * Removes the http-only cookie from response.
 * @return {Object} { token: String, username: String, name: String, id: String }
 */
logoutRouter.post('/', async (request, response) => response
  .clearCookie('token')
  .status(200)
  .end());

export default logoutRouter;
