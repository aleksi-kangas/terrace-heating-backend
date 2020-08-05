import express from 'express';
import HeatPump from '../models/heatPump';

const heatPumpRouter = new express.Router();

/**
 * Used for fetching all heat pump data.
 * @return {Array<Object>} Heat pump data
 */
heatPumpRouter.get('/', async (req, res) => {
  const data = await HeatPump.find({});
  return res.json(data.map((entry) => entry.toJSON()));
});

export default heatPumpRouter;
