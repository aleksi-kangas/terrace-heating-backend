import HeatPump from '../models/heatPump.js';

/**
 * Fetches all entries of HeatPump from MongoDB.
 * @return {Array<Object>} Heat pump data entries
 */
const getAll = async () => {
  const data = await HeatPump.find({});
  return data.map((entry) => entry.toJSON());
};

export default {
  getAll,
};
