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
 * @return {Array.<Object>} - contains heat pump data from the given date onwards
 */
heatPumpRouter.get('/', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      // Optional query strings
      const date = {
        year: req.query.year,
        month: req.query.month,
        day: req.query.day,
      };
      const data = await HeatPumpService.getData(date);
      return res.json(data);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.get('/status', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const data = await HeatPumpService.getStatus();
      return res.json(data);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.post('/start', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const { softStart } = req.body;
      let newStatus;

      if (softStart) {
        await HeatPumpService.softStartCircuitThree();
        newStatus = await HeatPumpService.getStatus();
      } else {
        await HeatPumpService.startCircuitThree();
        newStatus = await HeatPumpService.getStatus();
      }
      return res.status(200).json(newStatus);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.post('/stop', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      await HeatPumpService.stopCircuitThree();
      const newStatus = await HeatPumpService.getStatus();
      return res.status(200).json(newStatus);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.get('/schedules/:variable', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const { variable } = req.params;
      if (variable !== 'heatDistCircuit3' && variable !== 'lowerTank') {
        return res.json({
          error: 'Unknown variable',
        }).status(400).end();
      }
      const data = await HeatPumpService.getSchedule(variable);
      return res.json(data);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

export default heatPumpRouter;
