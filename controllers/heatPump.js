import express from 'express';
import HeatPumpService from '../services/heatPumpService.js';
import { authorizeToken } from '../utils/middleware.js';

const heatPumpRouter = new express.Router();

/**
 * Endpoint for fetching heat pump data.
 *
 * Optional query strings year, month and day determine a date,
 * that is used for filtering and including heat pump data entries from that date onwards.
 *
 * @return {Array.<Object>} - contains heat pump data from the given date onwards
 */
heatPumpRouter.get('/', authorizeToken, async (req, res) => {
  // Optional query strings
  const date = {
    year: req.query.year,
    month: req.query.month,
    day: req.query.day,
  };
  const data = await HeatPumpService.getData(date);
  return res.json(data);
});

/**
 * Endpoint for fetching status of the heating system.
 * Status is one of 'running', 'stopped', 'softStart' or 'boosting'.
 * @return {Object} status: 'running' || 'stopped' || 'softStart' || 'boosting'
 */
heatPumpRouter.get('/status', authorizeToken, async (req, res) => {
  const data = await HeatPumpService.getStatus();
  return res.json(data);
});

/**
 * Endpoint for starting the heating system.
 * Startup procedure can either be normal or 'soft-start'.
 * Soft-start means that heat distribution circuit is switched on immediately,
 * and 12 hours later boosting schedule is enabled.
 * Returns the new status after the startup.
 * @return {Object} status: 'running' || 'softStart' || 'boosting'
 */
heatPumpRouter.post('/start', authorizeToken, async (req, res) => {
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
});

/**
 * Endpoint for stopping the heating system.
 * Heat distribution circuit three and boosting schedules are turned off.
 * Returns the new status after stopping the heating.
 * @return {Object} status: 'stopped'
 */
heatPumpRouter.post('/stop', authorizeToken, async (req, res) => {
  await HeatPumpService.stopCircuitThree();
  const newStatus = await HeatPumpService.getStatus();
  return res.status(200).json(newStatus);
});

/**
 * Endpoint for fetching a boosting schedule of a variable.
 * Allowed variables are 'lowerTank' and 'heatDistCircuit3'.
 * Returns the boosting schedule of the variable,
 * containing start hour, end hour and temperature delta for each weekday.
 * @return {Object} { monday: { start: Number, end: Number, delta: Number }, ... }
 */
heatPumpRouter.get('/schedules/:variable', authorizeToken, async (req, res) => {
  const { variable } = req.params;
  if (variable !== 'heatDistCircuit3' && variable !== 'lowerTank') {
    return res.json({
      error: 'Unknown variable',
    }).status(400).end();
  }
  const data = await HeatPumpService.getSchedule(variable);
  return res.json(data);
});

heatPumpRouter.post('/schedules/:variable', authorizeToken, async (req, res) => {
  const { variable } = req.params;
  if (variable !== 'heatDistCircuit3' && variable !== 'lowerTank') {
    return res.status(400).json({
      error: 'Unknown variable',
    }).end();
  }
  const { schedule } = req.body;
  await HeatPumpService.setSchedule({ variable, schedule });
  return res.status(200).end();
});

heatPumpRouter.get('/scheduling', authorizeToken, async (req, res) => {
  const data = await HeatPumpService.getScheduling();
  return res.json(data);
});

heatPumpRouter.post('/scheduling', authorizeToken, async (req, res) => {
  const { scheduling } = req.body;
  const newStatus = await HeatPumpService.setScheduling(scheduling);
  return res.status(200).json(newStatus);
});

export default heatPumpRouter;
