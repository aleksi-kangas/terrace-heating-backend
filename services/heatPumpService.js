import moment from 'moment';
import HeatPump from '../models/heatPump.js';
import ModBusService from '../utils/modBus.js';

/**
 * Fetches heat pump data entries from the given date onwards.
 *
 * The amount of heat pump entries to retrieve is determined
 * by the request's query strings year, month and day.
 * If any of those are absent, the method retrieves all heat pump entries from MongoDB.
 *
 * @param {Object} date - with properties year, month, day
 * @return {Array<Object>} - contains heat pump data entries from the given date onwards (or all)
 */
const getData = async (date) => {
  // If any of the properties of date are missing, retrieve all entries of heat pump data.
  if (!date.year || !date.month || !date.day) {
    return HeatPump.find({});
  }

  const dateThreshold = moment(`${date.year}-${date.month}-${date.day}`);

  // If the date is not valid, retrieve all entries of heat pump data.
  if (!dateThreshold.isValid()) {
    return HeatPump.find({});
  }

  // If year, month and day properties are present and form a valid date,
  // retrieve entries of heat pump data from that date onwards.
  const dateLimit = moment(`${date.year}-${date.month}-${date.day}`).format('YYYY-MM-DD');
  return HeatPump.find({ time: { $gt: dateLimit } });
};

/**
 * Retrieves the amount of active heat distribution circuits from the heat pump.
 * @return {Number} - the amount of active heat distribution circuits (usually 2 or 3)
 */
const getActiveCircuits = async () => ModBusService.queryNumberOfActiveCircuits();

/**
 * Toggles the amount of active heat distribution circuits from 2 to 3 and vice versa.
 * Toggling is based on the current state of the heat pump.
 */
const toggleCircuitThree = async () => ModBusService.toggleCircuitThree();

const getSchedule = async (variable) => ModBusService.querySchedule(variable);

export default {
  getData, getActiveCircuits, getSchedule, toggleCircuitThree,
};
