import express from 'express';
import HeatPumpService from '../services/heatPumpService.js';

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

heatPumpRouter.get('/circuits', async (req, res) => {
  const data = await HeatPumpService.getActiveCircuits();
  return res.json(data);
});

heatPumpRouter.post('/circuits', async (req, res) => {
  await HeatPumpService.toggleCircuitThree();
  return res.status(200).end();
});

export default heatPumpRouter;
