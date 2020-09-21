import express from 'express';
import loginService from '../services/loginService.js';

const loginRouter = new express.Router();

loginRouter.post('/', async (request, response) => {
  const credentials = {
    username: request.body.username,
    password: request.body.password,
  };

  // Attempt to login
  const result = await loginService.login(credentials);

  // Password is wrong
  if (!result) {
    return response.status(401).json({ error: 'invalid username or password' });
  }

  return response.status(200).send({
    token: result.token,
    username: result.username,
    name: result.name,
    id: result.id,
  });
});

export default loginRouter;
