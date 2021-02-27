import registers from './registers';
import HeatPump from '../../models/heatPump';
import client from './modBus';
import { parseHeatPumpData, parseLowerTankSchedule, parseCircuitThreeSchedule } from './parsers';

/**
 * Contains endpoints for interacting with the heat-pump via ModBus-protocol.
 */

/**
 * Sets the number of active heat distribution circuits to three, i.e. enables circuit three.
 */
const startCircuitThree = async () => {
  await client.writeRegister(5100, 3);
};

/**
 * Sets the number of active heat distribution circuits to two, i.e. disables circuit three.
 */
const stopCircuitThree = async () => {
  await client.writeRegister(5100, 2);
};

/**
 * Writes true (enables) to the scheduling coil of the heat-pump.
 */
const enableScheduling = async () => client.writeCoil(registers.schedulingActive, true);

/**
 * Writes false (disables) to the scheduling coil of the heat-pump.
 */
const disableScheduling = async () => {
  await client.writeCoil(registers.schedulingActive, false);
};

/**
 * Queries heat-pump for scheduling status, i.e. enabled/disabled.
 * @return Boolean
 */
const querySchedulingStatus = async () => {
  const status = await client.readCoils(134, 1);
  return status.data[0];
};

/**
 * Queries predetermined registers from the heat pump and saves the queried data to MongoDB.
 * @return {Object} - contains saved data
 */
const queryHeatPumpValues = async () => {
  const values = await client.readHoldingRegisters(1, 120);
  const compressorStatus = await client.readHoldingRegisters(registers.compressorStatus, 1);
  const parsedData = await parseHeatPumpData(values.data, compressorStatus.data[0]);
  const heatPumpData = new HeatPump(parsedData);
  return heatPumpData.save();
};

/**
 * Queries the number of active heat distribution circuits from the heat pump.
 * Reasonable return values are 2 and 3.
 * @return {Object} - number of active heat distribution circuits (usually 2 or 3)
 */
const queryActiveCircuits = async () => {
  const activeCircuits = await client.readHoldingRegisters(5100, 1);
  return activeCircuits.data[0];
};

/**
 * Queries the boosting schedule of either 'lowerTank' or 'heatDistCircuit3' from the heat-pump.
 * Returns an object containing start hour, end hour and temperature delta for each weekday.
 * @param variable String either 'lowerTank' or 'heatDistCircuit3'
 * @return Object { monday: { start: Number, end: Number, delta: Number }, ... }
 */
const querySchedule = async (variable) => {
  if (variable === 'lowerTank') {
    const scheduleTimes = await client.readHoldingRegisters(5014, 14);
    const scheduleDeltas = await client.readHoldingRegisters(36, 8);
    return parseLowerTankSchedule(scheduleTimes.data, scheduleDeltas.data);
  }
  if (variable === 'heatDistCircuit3') {
    const scheduleTimes = await client.readHoldingRegisters(5211, 14);
    const scheduleDeltas = await client.readHoldingRegisters(106, 7);
    return parseCircuitThreeSchedule(scheduleTimes.data, scheduleDeltas.data);
  }
  return null;
};

/**
 * Writes the schedule of the given variable to the heat-pump.
 * @param variableSchedule Object
 * {
 *  variable: 'lowerTank' || 'heatDistCircuit3',
 *  schedule: { sunday: { start: Number, end: Number, delta: Number }, ... }
 * }
 */
const setSchedule = async (variableSchedule) => {
  const { variable, schedule } = variableSchedule;
  let registerAddresses;
  if (variable === 'lowerTank') registerAddresses = registers.lowerTank;
  if (variable === 'heatDistCircuit3') registerAddresses = registers.heatDistCircuitThree;

  const weekDays = Object.keys(schedule);
  weekDays.forEach((weekDay) => {
    const startRegister = registerAddresses[weekDay].start;
    const endRegister = registerAddresses[weekDay].end;
    const deltaRegister = registerAddresses[weekDay].delta;
    client.writeRegister(startRegister, schedule[weekDay].start).then();
    client.writeRegister(endRegister, schedule[weekDay].end).then();
    client.writeRegister(deltaRegister, schedule[weekDay].delta).then();
  });
  return null;
};

const ModBusApi = {
  startCircuitThree,
  stopCircuitThree,
  enableScheduling,
  disableScheduling,
  queryActiveCircuits,
  queryHeatPumpValues,
  querySchedule,
  querySchedulingStatus,
  setSchedule,
};

export default ModBusApi;
