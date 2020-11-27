import express from 'express';
import jwt from 'jsonwebtoken';
import HeatPumpService from '../services/heatPumpService.js';
import User from '../models/user.js';

const authorize = async (request) => {
  const decodedToken = jwt.verify(request.token, process.env.JWT);
  return User.findById(decodedToken.id);
};

const heatPumpRouter = new express.Router();

/**
 * Endpoint for fetching heat pump data.
 *
 * Optional query strings year, month and day determine a date,
 * that is used for filtering and including heat pump data entries from that date onwards.
 *
 * @return {Array<Object>} - contains heat pump data from the given date onwards
 */
heatPumpRouter.get('/', async (req, res) => {
  // Optional query strings
  const date = {
    year: req.query.year,
    month: req.query.month,
    day: req.query.day,
  };
  const data = await HeatPumpService.getData(date);
  return res.json(data);
});

heatPumpRouter.get('/circuits', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const data = await HeatPumpService.getActiveCircuits();
      return res.json(data);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.post('/circuits', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const activeCircuits = req.body.circuits;
      if (activeCircuits !== 2 && activeCircuits !== 3) {
        return res.status(400).end();
      }
      await HeatPumpService.toggleCircuitThree();
      return res.status(200).end();
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

export default heatPumpRouter;
