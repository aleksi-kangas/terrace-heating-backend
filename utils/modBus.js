import ModBus from 'modbus-serial';
import moment from 'moment';
import config from './config';
import HeatPump from '../models/heatPump';
import CompressorStatus from '../models/compressorStatus';
import registers from './registers';

/**
 * Contains logic for communicating with the heat pump via ModBus-protocol.
 * Defined functions can be modified to achieve desired functionality.
 */

/**
 * Helper function for signing an unsigned 16 bit number.
 * @param value - number to be signed
 * @return {number} - the signed representation of the input value
 */
const signUnsignedValues = (value) => {
  let signed = value;
  // Sign 16 bit values
  if (value > 65535 / 2) {
    signed = value - 65536;
  }
  // Place decimal separator to the correct place
  signed /= 10;
  return signed;
};

/**
 * Parses current compressor usage and determines,
 * whether the current update is either a start point or end point for a compressor cycle.
 * @param compressorRunning Boolean
 * @param timeStamp time of the query of the values
 * @return {Promise<null>}
 */
const parseCompressorUsage = async (compressorRunning, timeStamp) => {
  let compressorUsage = null;
  const latestEntry = await HeatPump.findOne().sort({ field: 'asc', _id: -1 }).limit(1);
  if (compressorRunning && latestEntry && !latestEntry.compressorRunning) {
    // Current update is an edge 'not running' -> 'running'.
    // Calculate the duration of the last cycle (running + not running).
    const lastStartEntry = await CompressorStatus.find({ type: { $eq: 'start' } }).sort({ field: 'asc', _id: -1 }).limit(1);
    const lastStopEntry = await CompressorStatus.find({ type: { $eq: 'end' } }).sort({ field: 'asc', _id: -1 }).limit(1);
    if (lastStartEntry.length !== 0 && lastStopEntry.length !== 0) {
      const start = moment(lastStartEntry[0].time);
      const stop = moment(lastStopEntry[0].time);
      const cycleDuration = moment.duration(timeStamp.diff(start));
      const runningDuration = moment.duration(stop.diff(start));
      // Usage of the compressor during last cycle.
      // eslint-disable-next-line max-len
      compressorUsage = Math.round((runningDuration.asMinutes() / cycleDuration.asMinutes() + Number.EPSILON) * 100) / 100;
    }
    // Add start entry
    const compressorStatusEntry = new CompressorStatus({
      type: 'start',
      time: timeStamp,
    });
    await compressorStatusEntry.save();
  } else if (!compressorRunning && latestEntry && latestEntry.compressorRunning) {
    // Fetch previous end point that resembles the starting point for this cycle
    const lastStopEntry = await CompressorStatus.find({ type: { $eq: 'end' } }).sort({ field: 'asc', _id: -1 }).limit(1);
    // Fetch previous start point that resembles the middle point for this cycle
    const lastStartEntry = await CompressorStatus.find({ type: { $eq: 'start' } }).sort({ field: 'asc', _id: -1 }).limit(1);
    if (lastStopEntry.length !== 0 && lastStartEntry.length !== 0) {
      const stop = moment(lastStopEntry[0].time);
      const start = moment(lastStartEntry[0].time);
      // Calculate running duration and the whole cycle duration
      const runningDuration = moment.duration(timeStamp.diff(start));
      const cycleDuration = moment.duration(timeStamp.diff(stop));
      // Usage of the compressor during last cycle.
      // eslint-disable-next-line max-len
      compressorUsage = Math.round((runningDuration.asMinutes() / cycleDuration.asMinutes() + Number.EPSILON) * 100) / 100;
    }
    // Add end entry
    const compressorStatusEntry = new CompressorStatus({
      type: 'end',
      time: timeStamp,
    });
    await compressorStatusEntry.save();
  }
  return compressorUsage;
};

/**
 * Parses and signs predetermined heat pump data from a ModBus query result.
 * @return {Object} - contains predetermined signed heat pump data
 */
const parseHeatPumpData = async (data, compressorStatus) => {
  const compressorRunning = compressorStatus === 1;
  const timeStamp = new Date();
  const compressorUsage = await parseCompressorUsage(compressorRunning, moment(timeStamp));

  return ({
    time: timeStamp,
    outsideTemp: signUnsignedValues(data[0]),
    hotGasTemp: signUnsignedValues(data[1]),
    heatDistCircuitTemp1: signUnsignedValues(data[4]),
    heatDistCircuitTemp2: signUnsignedValues(data[5]),
    lowerTankTemp: signUnsignedValues(data[16]),
    upperTankTemp: signUnsignedValues(data[17]),
    insideTemp: signUnsignedValues(data[73]),
    groundLoopTempOutput: signUnsignedValues(data[97]),
    groundLoopTempInput: signUnsignedValues(data[98]),
    heatDistCircuitTemp3: signUnsignedValues(data[116]),
    compressorRunning,
    compressorUsage,
  });
};

const parseLowerTankSchedule = (times, deltas) => ({
  monday: {
    start: times[0],
    end: times[7],
    delta: deltas[0],
  },
  tuesday: {
    start: times[1],
    end: times[8],
    delta: deltas[1],
  },
  wednesday: {
    start: times[2],
    end: times[9],
    delta: deltas[2],
  },
  thursday: {
    start: times[3],
    end: times[10],
    delta: deltas[3],
  },
  friday: {
    start: times[4],
    end: times[11],
    delta: deltas[5],
  },
  saturday: {
    start: times[5],
    end: times[12],
    delta: deltas[6],
  },
  sunday: {
    start: times[6],
    end: times[13],
    delta: deltas[7],
  },
});

const parseCircuitThreeSchedule = (times, deltas) => ({
  monday: {
    start: times[3],
    end: times[2],
    delta: deltas[1],
  },
  tuesday: {
    start: times[0],
    end: times[1],
    delta: deltas[0],
  },
  wednesday: {
    start: times[9],
    end: times[10],
    delta: deltas[4],
  },
  thursday: {
    start: times[11],
    end: times[4],
    delta: deltas[5],
  },
  friday: {
    start: times[12],
    end: times[13],
    delta: deltas[6],
  },
  saturday: {
    start: times[5],
    end: times[6],
    delta: deltas[2],
  },
  sunday: {
    start: times[7],
    end: times[8],
    delta: deltas[3],
  },
});

// Connect to the heat pump via ModBus-protocol
const client = new ModBus();
client.connectTCP(config.MODBUS_HOST, { port: config.MODBUS_PORT })
  .then();

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
  if (variable === 'lowerTank') {
    const lowerTankRegisters = registers.lowerTank;
    const weekDays = Object.keys(schedule);
    weekDays.forEach((weekDay) => {
      const startRegister = lowerTankRegisters[weekDay].start;
      const endRegister = lowerTankRegisters[weekDay].end;
      const deltaRegister = lowerTankRegisters[weekDay].delta;
      client.writeRegister(startRegister, schedule[weekDay].start).then();
      client.writeRegister(endRegister, schedule[weekDay].end).then();
      client.writeRegister(deltaRegister, schedule[weekDay].delta).then();
    });
  }
  if (variable === 'heatDistCircuit3') {
    const heatDistCircuit3Registers = registers.heatDistCircuit3;
    const weekDays = Object.keys(schedule);
    weekDays.forEach((weekDay) => {
      const startRegister = heatDistCircuit3Registers[weekDay].start;
      const endRegister = heatDistCircuit3Registers[weekDay].end;
      const deltaRegister = heatDistCircuit3Registers[weekDay].delta;
      client.writeRegister(startRegister, schedule[weekDay].start).then();
      client.writeRegister(endRegister, schedule[weekDay].end).then();
      client.writeRegister(deltaRegister, schedule[weekDay].delta).then();
    });
  }
  return null;
};

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
const getSchedulingStatus = async () => {
  const status = await client.readCoils(134, 1);
  return status.data[0];
};

export default {
  queryHeatPumpValues,
  queryActiveCircuits,
  querySchedule,
  setSchedule,
  enableScheduling,
  disableScheduling,
  getSchedulingStatus,
  startCircuitThree,
  stopCircuitThree,
};
