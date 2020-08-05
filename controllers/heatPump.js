import express from 'express';
import HeatPumpService from '../services/heatPumpService.js';

const heatPumpRouter = new express.Router();

/**
 * Used for fetching all heat pump data.
 * @return {Array<Object>} Heat pump data
 */
heatPumpRouter.get('/', async (req, res) => {
  const data = await HeatPumpService.getAll();
  return res.json(data);
});

export default heatPumpRouter;
