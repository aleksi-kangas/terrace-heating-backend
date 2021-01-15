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

const setSchedule = async (variableSchedule) => ModBusService.setSchedule(variableSchedule);

const getScheduling = async () => {
  const scheduling = await ModBusService.getSchedulingStatus();
  const lowerTank = await ModBusService.querySchedule('lowerTank');
  const heatDistCircuit3 = await ModBusService.querySchedule('heatDistCircuit3');
  return { scheduling, lowerTank, heatDistCircuit3 };
};

/**
 * Retrieves the amount of active heat distribution circuits from the heat pump.
 * @return {Number} - the amount of active heat distribution circuits (usually 2 or 3)
 */
const getStatus = async () => {
  const circuits = await ModBusService.queryActiveCircuits();
  const schedulingActive = await getScheduling();
  if (circuits === 3) {
    if (softStart) {
      return { status: 'softStart' };
    }
    if (!schedulingActive) {
      return { status: 'running' };
    }
    const circuitThreeSchedule = await getSchedule('heatDistCircuit3');
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

const startCircuitThree = async () => {
  await ModBusService.startCircuitThree();
  await ModBusService.enableScheduling();
};

const softStartCircuitThree = async () => {
  softStart = true;
  const timeStamp = new Date();
  timeStamp.setHours(timeStamp.getHours() + 12);
  await ModBusService.startCircuitThree();
  schedule.scheduleJob(timeStamp, async () => {
    softStart = false;
    await ModBusService.enableScheduling();
  });
};

const stopCircuitThree = async () => {
  await ModBusService.disableScheduling();
  await ModBusService.stopCircuitThree();
  softStart = false;
};

const setScheduling = async (schedulingEnable) => {
  if (schedulingEnable) {
    // Turning on scheduling
    softStart = false;
    await ModBusService.enableScheduling();
    return getStatus();
  }
  if (!schedulingEnable) {
    // Turning off scheduling
    await ModBusService.disableScheduling();
    return getStatus();
  }
  return null;
};

export default {
  getData,
  getStatus,
  getSchedule,
  setSchedule,
  startCircuitThree,
  getScheduling,
  setScheduling,
  softStartCircuitThree,
  stopCircuitThree,
};
