import moment from 'moment';
import schedule from 'node-schedule';
import HeatPump from '../models/heatPump.js';
import ModBusService from '../utils/modBus.js';

let softStart = false;

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

const getSchedule = async (variable) => ModBusService.querySchedule(variable);

/**
 * Retrieves the amount of active heat distribution circuits from the heat pump.
 * @return {Number} - the amount of active heat distribution circuits (usually 2 or 3)
 */
const getStatus = async () => {
  const circuits = await ModBusService.queryActiveCircuits();
  const circuitThreeSchedule = await getSchedule('heatDistCircuit3');
  if (circuits === 3) {
    if (softStart) {
      return { status: 'softStart' };
    }

    const now = new Date();
    const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekDay = weekDays[now.getDay()];
    const scheduleHours = circuitThreeSchedule[weekDay];
    if (Number(scheduleHours.start) < now.getHours() + 1
      && now.getHours() + 1 < Number(scheduleHours.end)) {
      return { status: 'boosting' };
    }
    return { status: 'running' };
  }
  return { status: 'stopped' };
};

const startCircuitThree = async () => ModBusService.startCircuitThree();

const softStartCircuitThree = async () => {
  const now = moment();
  const executeMoment = now.add(12, 'hours');
  schedule.scheduleJob(executeMoment, () => {
    softStart = false;
    // TODO Set schedules active
  });
};

const stopCircuitThree = async () => ModBusService.stopCircuitThree();

export default {
  getData, getStatus, getSchedule, startCircuitThree, softStartCircuitThree, stopCircuitThree,
};
