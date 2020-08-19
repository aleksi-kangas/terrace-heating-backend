import express from 'express';
import HeatPumpService from '../services/heatPumpService.js';

const heatPumpRouter = new express.Router();

/**
 * Endpoint for fetching heat pump data.
 *
 * Optional query strings year, month and day determine a date,
 * that is used for filtering and including heat pump data entries from that date onwards.
 *
 * @return {Array<Object>} Heat pump data
 */
heatPumpRouter.get('/', async (req, res) => {
  const date = {
    year: req.query.year,
    month: req.query.month,
    day: req.query.day,
  };
  const data = await HeatPumpService.getData(date);
  return res.json(data);
});

export default heatPumpRouter;
