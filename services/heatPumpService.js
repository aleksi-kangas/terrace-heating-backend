import moment from 'moment';
import HeatPump from '../models/heatPump.js';

/**
 * Fetches heat pump data entries from the given date onwards.
 *
 * The amount of heat pump entries to retrieve is determined
 * by the request's query strings year, month and day.
 * If any of those are absent, the method retrieves all heat pump entries from MongoDB.
 *
 * @param date {Object} with properties year, month, day
 * @return {Array<Object>} Heat pump data entries within the last 24 hours
 */
const getData = async (date) => {
  // If any of the properties of date are missing,
  // retrieve all entries of heat pump data.
  if (!date.year || !date.month || !date.day) {
    return HeatPump.find({});
  }
  // If year, month and day properties are present,
  // retrieve entries of heat pump data from that date onwards.
  const dateLimit = moment(`${date.year}-${date.month}-${date.day}`).format('YYYY-MM-DD');
  return HeatPump.find({ time: { $gt: dateLimit } });
};

export default {
  getData,
};
