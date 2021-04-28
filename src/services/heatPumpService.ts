import moment from 'moment';
import scheduler from 'node-schedule';
import HeatPump, { HeatPumpEntryDocument } from '../models/heatPump';
import ModBusApi from './modbus/api';
import {
  HeatingStatus, ScheduleVariable, VariableHeatingSchedule, WeekDays,
} from '../types';

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
const getData = async (
  date: { year: string | null, month: string | null, day: string | null },
): Promise<HeatPumpEntryDocument[]> => {
  // If any of the properties of date are missing, retrieve all entries of heat pump data.
  if (!date.year || !date.month || !date.day) {
    return HeatPump.find({});
  }

  const dateThreshold = moment(`${date.year}${date.month}${date.day}`);

  // If the date is not valid, retrieve all entries of heat pump data.
  if (!dateThreshold.isValid()) {
    return HeatPump.find({});
  }

  // If year, month and day properties are present and form a valid date,
  // retrieve entries of heat pump data from that date onwards.
  return HeatPump.find({ time: { $gt: dateThreshold } });
};

/**
 * Fetches boosting schedule of the given variable from the heat-pump.
 * @param variable 'lowerTank' || 'heatDistCircuit3'
 * @return Object { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... }
 */
const getSchedule = async (
  variable: ScheduleVariable,
): Promise<VariableHeatingSchedule> => ModBusApi.querySchedule(variable);

/**
 * Sets the boosting schedule of the given variable to the heat-pump.
 * e.g. {
 * variable: 'lowerTank' || 'heatDistCircuit3',
 * schedule: { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... }
 * }
 * @param variable
 * @param schedule
 */
const setSchedule = async (
  variable: ScheduleVariable, schedule: VariableHeatingSchedule,
): Promise<void> => ModBusApi.setSchedule(variable, schedule);

/**
 * Retrieves the status of scheduling,
 * and schedules for 'lowerTank' and 'heatDistCircuit3' from the heat-pump.
 * @return Object {
 * scheduling: Boolean,
 * lowerTank: { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... },
 * heatDistCircuit3: { sunday: { start: Number, delta: Number, end: Number }, saturday: { ... }, ... },
 * }
 */
const getSchedulingEnabled = async (): Promise<boolean> => ModBusApi.querySchedulingStatus();

/**
 * Retrieves the amount of active heat distribution circuits from the heat pump.
 * @return {Number} - the amount of active heat distribution circuits (usually 2 or 3)
 */
const getStatus = async (): Promise<HeatingStatus> => {
  const circuits = await ModBusApi.queryActiveCircuits();
  const schedulingEnabled = await getSchedulingEnabled();
  if (circuits === 3) {
    if (softStart) {
      return HeatingStatus.SoftStart;
    }
    if (!schedulingEnabled) {
      return HeatingStatus.Running;
    }
    const circuitThreeSchedule = await getSchedule(ScheduleVariable.HeatDistCircuit3);
    const now = new Date();
    const weekDay = Object.values(WeekDays)[moment()
      .isoWeekday() - 1];
    const scheduleHours = circuitThreeSchedule[weekDay];
    if (Number(scheduleHours.start) < now.getHours() + 1
      && now.getHours() + 1 < Number(scheduleHours.end)) {
      return HeatingStatus.Boosting;
    }
    return HeatingStatus.Running;
  }
  return HeatingStatus.Stopped;
};

/**
 * Starts the heat distribution circuit 3 of the heat-pump.
 * It includes turning on circuit 3 and enabling boosting schedule.
 * @return {Promise<void>}
 */
const startCircuitThree = async (): Promise<void> => {
  await ModBusApi.startCircuitThree();
  await ModBusApi.enableScheduling();
};

/**
 * Soft-starts the heat distribution circuit 3 of the heat-pump.
 * Soft-starting means that circuit 3 is turned on and 12 hours later boosting schedule is enabled.
 */
const softStartCircuitThree = async (): Promise<void> => {
  softStart = true;
  const timeStamp = new Date();
  timeStamp.setHours(timeStamp.getHours() + 12);
  await ModBusApi.startCircuitThree();
  scheduler.scheduleJob(timeStamp, async () => {
    softStart = false;
    await ModBusApi.enableScheduling();
  });
};

/**
 * Stops the heat distribution circuit 3 of the heat-pump.
 * Includes disabling of the boosting schedule.
 */
const stopCircuitThree = async (): Promise<void> => {
  await ModBusApi.disableScheduling();
  await ModBusApi.stopCircuitThree();
  softStart = false;
};

/**
 * Enables/disables boosting schedule for the heat-pump.
 * When active, 'lowerTank' and 'heatDistCircuit3' are boosted according to the set schedules.
 * @param enableScheduling boolean
 */
const setSchedulingEnabled = async (enableScheduling: boolean): Promise<HeatingStatus> => {
  if (enableScheduling) {
    // Turning on scheduling
    softStart = false;
    await ModBusApi.enableScheduling();
  } else {
    // Turning off scheduling
    await ModBusApi.disableScheduling();
  }
  return getStatus();
};

export default {
  getData,
  getStatus,
  getSchedule,
  setSchedule,
  startCircuitThree,
  getSchedulingEnabled,
  setSchedulingEnabled,
  softStartCircuitThree,
  stopCircuitThree,
};
