import registers from './registers';
import HeatPump from '../../models/heatPump';
import client from './modBus';
import { parseCircuitThreeSchedule, parseHeatPumpData, parseLowerTankSchedule } from './parsers';
import {
  HeatPumpEntry, ScheduleVariable, VariableHeatingSchedule, WeekDays,
} from '../../types';

/**
 * Contains endpoints for interacting with the heat-pump via ModBus-protocol.
 */

/**
 * Sets the number of active heat distribution circuits to three, i.e. enables circuit three.
 */
const startCircuitThree = async (): Promise<void> => {
  await client.writeRegister(5100, 3);
};

/**
 * Sets the number of active heat distribution circuits to two, i.e. disables circuit three.
 */
const stopCircuitThree = async (): Promise<void> => {
  await client.writeRegister(5100, 2);
};

/**
 * Writes true (enables) to the scheduling coil of the heat-pump.
 */
const enableScheduling = async (): Promise<void> => {
  await client.writeCoil(registers.schedulingActive, true);
};

/**
 * Writes false (disables) to the scheduling coil of the heat-pump.
 */
const disableScheduling = async (): Promise<void> => {
  await client.writeCoil(registers.schedulingActive, false);
};

/**
 * Queries heat-pump for scheduling status, i.e. enabled/disabled.
 * @return boolean
 */
const querySchedulingStatus = async (): Promise<boolean> => {
  const status = await client.readCoils(134, 1);
  return status.data[0];
};

/**
 * Queries predetermined registers from the heat pump and saves the queried data to MongoDB.
 * @return HeatPumpEntry queried heat-pump data
 */
const queryHeatPumpValues = async (): Promise<HeatPumpEntry> => {
  const values = await client.readHoldingRegisters(1, 120);
  const compressorStatus = await client.readHoldingRegisters(registers.compressorStatus, 1);
  const parsedData = await parseHeatPumpData(values.data, compressorStatus.data[0]);
  const heatPumpData = new HeatPump(parsedData);
  await heatPumpData.save();
  return parsedData;
};

/**
 * Queries the number of active heat distribution circuits from the heat pump.
 * Reasonable return values are 2 and 3.
 * @return number active heat distribution circuits (usually 2 or 3)
 */
const queryActiveCircuits = async (): Promise<number> => {
  const activeCircuits = await client.readHoldingRegisters(5100, 1);
  return activeCircuits.data[0];
};

/**
 * Queries the boosting schedule of either 'lowerTank' or 'heatDistCircuit3' (ScheduleVariable) from the heat-pump.
 * Returns a VariableHeatingSchedule-object which contains start and end hour and temperature delta for each weekday.
 * @param variable ScheduleVariable.LowerTank || ScheduleVariable.HeatDistCircuit3
 * @return VariableHeatingSchedule
 */
const querySchedule = async (
  variable: ScheduleVariable,
): Promise<VariableHeatingSchedule> => {
  if (variable === ScheduleVariable.LowerTank) {
    const scheduleTimes = await client.readHoldingRegisters(5014, 14);
    const scheduleDeltas = await client.readHoldingRegisters(36, 8);
    return parseLowerTankSchedule(scheduleTimes.data, scheduleDeltas.data);
  }
  if (variable === ScheduleVariable.HeatDistCircuit3) {
    const scheduleTimes = await client.readHoldingRegisters(5211, 14);
    const scheduleDeltas = await client.readHoldingRegisters(106, 7);
    return parseCircuitThreeSchedule(scheduleTimes.data, scheduleDeltas.data);
  }
  // Null is never returned
  return null as never;
};

/**
 * Writes the schedule of the given variable to the heat-pump.
 * @param variable ScheduleVariable.LowerTank || ScheduleVariable.HeatDistCircuit3
 * @param schedule VariableHeatingSchedule
 */
const setSchedule = async (
  variable: ScheduleVariable, schedule: VariableHeatingSchedule,
): Promise<void> => {
  let registerAddresses: VariableHeatingSchedule;
  if (variable === ScheduleVariable.LowerTank) registerAddresses = registers.lowerTank;
  if (variable === ScheduleVariable.HeatDistCircuit3) registerAddresses = registers.heatDistCircuitThree;

  Object.values(WeekDays).forEach((weekDay: WeekDays) => {
    const startRegister = registerAddresses[weekDay].start;
    const endRegister = registerAddresses[weekDay].end;
    const deltaRegister = registerAddresses[weekDay].delta;
    client.writeRegister(startRegister, schedule[weekDay].start).then();
    client.writeRegister(endRegister, schedule[weekDay].end).then();
    client.writeRegister(deltaRegister, schedule[weekDay].delta).then();
  });
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
