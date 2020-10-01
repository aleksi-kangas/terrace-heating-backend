import express from 'express';
import alertService from '../services/alertService.js';

const alertRouter = new express.Router();

/**
 * Endpoint for fetching all alerts.
 * @return {Array<Object>} alerts - containing all alerts of the user
 */
alertRouter.get('/:user', async (request, response) => {
  const alerts = await alertService.getAll(request.params.user);
  return response.json(alerts);
});

/**
 * Endpoint for creating an alert.
 * @return {Object} alert - saved to the database
 */
alertRouter.post('/', async (request, response) => {
  const {
    variable, lowerLimit, upperLimit, user,
  } = request.body;
  const alert = alertService.create(variable, lowerLimit, upperLimit, user);
  return response.json(alert);
});

export default alertRouter;
