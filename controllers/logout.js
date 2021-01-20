import express from 'express';

const logoutRouter = new express.Router();

/**
 * Endpoint for user logout.
 * Removes the http-only cookie from response.
 * @return {Object} { token: String, username: String, name: String, id: String }
 */
logoutRouter.post('/', (request, response) => {
  request.session.destroy(() => {
    response.redirect('/');
  });
});

export default logoutRouter;
