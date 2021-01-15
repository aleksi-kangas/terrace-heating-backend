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

/**
 * Endpoint for fetching status of the heating system.
 * Status is one of 'running', 'stopped', 'softStart' or 'boosting'.
 * @return {Object} status: 'running' || 'stopped' || 'softStart' || 'boosting'
 */
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

/**
 * Endpoint for starting the heating system.
 * Startup procedure can either be normal or 'soft-start'.
 * Soft-start means that heat distribution circuit is switched on immediately,
 * and 12 hours later boosting schedule is enabled.
 * Returns the new status after the startup.
 * @return {Object} status: 'running' || 'softStart' || 'boosting'
 */
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

/**
 * Endpoint for stopping the heating system.
 * Heat distribution circuit three and boosting schedules are turned off.
 * Returns the new status after stopping the heating.
 * @return {Object} status: 'stopped'
 */
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

/**
 * Endpoint for fetching a boosting schedule of a variable.
 * Allowed variables are 'lowerTank' and 'heatDistCircuit3'.
 * Returns the boosting schedule of the variable,
 * containing start hour, end hour and temperature delta for each weekday.
 * @return {Object} { monday: { start: Number, end: Number, delta: Number }, ... }
 */
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

heatPumpRouter.post('/schedules/:variable', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const { variable } = req.params;
      if (variable !== 'heatDistCircuit3' && variable !== 'lowerTank') {
        return res.status(400).json({
          error: 'Unknown variable',
        }).end();
      }
      const { schedule } = req.body;
      await HeatPumpService.setSchedule({ variable, schedule });
      return res.status(200).end();
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.get('/scheduling', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const data = await HeatPumpService.getScheduling();
      return res.json(data);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

heatPumpRouter.post('/scheduling', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      const { scheduling } = req.body;
      await HeatPumpService.setScheduling(scheduling);
      return res.status(200).end();
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});

export default heatPumpRouter;
