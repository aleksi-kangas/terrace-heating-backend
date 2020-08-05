import Router from 'express';
import { HeatPump } from '../models/heatPump.js';

const heatPumpRouter = Router();

/**
 * Used for fetching all heat pump data.
 * @return {Array<Object>} Heat pump data
 */
heatPumpRouter.get('/', async (req, res) => {
  const data = await HeatPump.find({});
  return res.json(data.map(entry => entry.toJSON()))
});