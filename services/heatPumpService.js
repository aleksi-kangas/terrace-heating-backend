import moment from 'moment';
import schedule from 'node-schedule';
import HeatPump from '../models/heatPump';
import ModBusApi from './modbus/api';

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

/**
 * Fetches boosting schedule of the given variable from the heat-pump.
 * @param variable 'lowerTank' || 'heatDistCircuit3'
 * @return Object { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... }
 */
const getSchedule = async (variable) => ModBusApi.querySchedule(variable);

/**
 * Sets the boosting schedule of the given variable to the heat-pump.
 * @param variableSchedule Object containing schedule of either 'lowerTank' or 'heatDistCircuit3'
 * e.g. {
 * variable: 'lowerTank' || 'heatDistCircuit3',
 * schedule: { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... }
 * }
 */
const setSchedule = async (variableSchedule) => ModBusApi.setSchedule(variableSchedule);

/**
 * Retrieves the status of scheduling,
 * and schedules for 'lowerTank' and 'heatDistCircuit3' from the heat-pump.
 * @return Object {
 * scheduling: Boolean,
 * lowerTank: { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... },
 * heatDistCircuit3: { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... },
 * }
 */

const getScheduling = async () => {
  const scheduling = await ModBusApi.querySchedulingStatus();
  const lowerTank = await ModBusApi.querySchedule('lowerTank');
  const heatDistCircuitThree = await ModBusApi.querySchedule('heatDistCircuit3');
  return { scheduling, lowerTank, heatDistCircuit3: heatDistCircuitThree };
};

/**
 * Retrieves the amount of active heat distribution circuits from the heat pump.
 * @return {Number} - the amount of active heat distribution circuits (usually 2 or 3)
 */
const getStatus = async () => {
  const circuits = await ModBusApi.queryActiveCircuits();
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

/**
 * Starts the heat distribution circuit 3 of the heat-pump.
 * It includes turning on circuit 3 and enabling boosting schedule.
 * @return {Promise<void>}
 */
const startCircuitThree = async () => {
  await ModBusApi.startCircuitThree();
  await ModBusApi.enableScheduling();
};

/**
 * Soft-starts the heat distribution circuit 3 of the heat-pump.
 * Soft-starting means that circuit 3 is turned on and 12 hours later boosting schedule is enabled.
 */
const softStartCircuitThree = async () => {
  softStart = true;
  const timeStamp = new Date();
  timeStamp.setHours(timeStamp.getHours() + 12);
  await ModBusApi.startCircuitThree();
  schedule.scheduleJob(timeStamp, async () => {
    softStart = false;
    await ModBusApi.enableScheduling();
  });
};

/**
 * Stops the heat distribution circuit 3 of the heat-pump.
 * Includes disabling of the boosting schedule.
 */
const stopCircuitThree = async () => {
  await ModBusApi.disableScheduling();
  await ModBusApi.stopCircuitThree();
  softStart = false;
};

/**
 * Enables/disables boosting schedule for the heat-pump.
 * When active, 'lowerTank' and 'heatDistCircuit3' are boosted according to the set schedules.
 * @param schedulingEnable Boolean
 */
const setScheduling = async (schedulingEnable) => {
  if (schedulingEnable) {
    // Turning on scheduling
    softStart = false;
    await ModBusApi.enableScheduling();
    return getStatus();
  }
  if (!schedulingEnable) {
    // Turning off scheduling
    await ModBusApi.disableScheduling();
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
