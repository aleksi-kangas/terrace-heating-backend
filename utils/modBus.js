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
 * Cycle definition is: running time -> not running time || not running time -> running time
 * Cycles overlap to produce more data points.
 * @param compressorRunning Boolean
 * @param currentQueryTime time of the current query
 */
const parseCompressorUsage = async (compressorRunning, currentQueryTime) => {
  let compressorUsage = null;
  const latestHeatPumpEntry = await HeatPump.findOne().sort({ field: 'asc', _id: -1 }).limit(1);
  const lastStartEntry = await CompressorStatus.find({ type: { $eq: 'start' } }).sort({ field: 'asc', _id: -1 }).limit(1);
  const lastStopEntry = await CompressorStatus.find({ type: { $eq: 'end' } }).sort({ field: 'asc', _id: -1 }).limit(1);

  if (!latestHeatPumpEntry) {
    return null;
  }

  if (compressorRunning && !latestHeatPumpEntry.compressorRunning) {
    /*
    Current query represents the edge between 'not running' -> 'running'.
    Calculate the usage of compressor during the last cycle.
    Calculation will be done only if the database has at least one startEntry and stopEntry.
    Example: YYYYYYNNNN = 60 %
     */
    if (lastStartEntry.length !== 0 && lastStopEntry.length !== 0) {
      const startEntryTime = moment(lastStartEntry[0].time);
      const stopEntryTime = moment(lastStopEntry[0].time);
      const cycleDuration = moment.duration(currentQueryTime.diff(startEntryTime));
      const runningDuration = moment.duration(stopEntryTime.diff(startEntryTime));
      // Usage of the compressor during last cycle.
      // eslint-disable-next-line max-len
      compressorUsage = Math.round((runningDuration.asMinutes() / cycleDuration.asMinutes() + Number.EPSILON) * 100) / 100;
    }
    // Add cycle start entry
    const cycleStartEntry = new CompressorStatus({
      type: 'start',
      time: currentQueryTime,
    });
    await cycleStartEntry.save();
  } else if (!compressorRunning && latestHeatPumpEntry.compressorRunning) {
    /*
    Current query represents the edge between 'running' -> 'not running'.
    Calculate the usage of compressor during the last cycle.
    Calculation will be done only if the database has at least one startEntry and stopEntry.
    Example: NNNNYYYYYY = 60 %
     */
    if (lastStopEntry.length !== 0 && lastStartEntry.length !== 0) {
      const stopEntryTime = moment(lastStopEntry[0].time);
      const startEntryTime = moment(lastStartEntry[0].time);
      // Calculate running duration and the whole cycle duration
      const runningDuration = moment.duration(currentQueryTime.diff(startEntryTime));
      const cycleDuration = moment.duration(currentQueryTime.diff(stopEntryTime));
      // Usage of the compressor during last cycle.
      // eslint-disable-next-line max-len
      compressorUsage = Math.round((runningDuration.asMinutes() / cycleDuration.asMinutes() + Number.EPSILON) * 100) / 100;
    }
    // Add cycle end entry
    const compressorStatusEntry = new CompressorStatus({
      type: 'end',
      time: currentQueryTime,
    });
    await compressorStatusEntry.save();
  }
  return compressorUsage;
};

/**
 * Parser for lowerTank and upperTank limits.
 * Returns new limits every ten minutes or if any of the limits have changed.
 * Otherwise returned limits will be null.
 * @param lowerTankLowerLimit current value of lowerTankLowerLimit
 * @param lowerTankUpperLimit current value of lowerTankUpperLimit
 * @param upperTankLowerLimit current value of upperTankLowerLimit
 * @param upperTankUpperLimit current value of upperTankUpperLimit
 * @param timeStamp time of the current query
 * @return Object containing new limits
 */
const parseTankLimits = async (
  lowerTankLowerLimit, lowerTankUpperLimit, upperTankLowerLimit, upperTankUpperLimit, timeStamp,
) => {
  const latestHeatPumpEntry = await HeatPump.findOne().sort({ field: 'asc', _id: -1 }).limit(1);

  // Updating limits every ten minutes
  if (!latestHeatPumpEntry || timeStamp.minutes() % 10 === 0) {
    return {
      lowerTankLowerLimit,
      lowerTankUpperLimit,
      upperTankLowerLimit,
      upperTankUpperLimit,
    };
  }

  const result = {
    lowerTankLowerLimit: null,
    lowerTankUpperLimit: null,
    upperTankLowerLimit: null,
    upperTankUpperLimit: null,
  };

  // Limits have changed
  if (latestHeatPumpEntry.lowerTankLowerLimit
    && latestHeatPumpEntry.lowerTankLowerLimit !== lowerTankLowerLimit) {
    result.lowerTankLowerLimit = lowerTankLowerLimit;
  }
  if (latestHeatPumpEntry.lowerTankUpperLimit
    && latestHeatPumpEntry.lowerTankUpperLimit !== lowerTankUpperLimit) {
    result.lowerTankUpperLimit = lowerTankUpperLimit;
  }
  if (latestHeatPumpEntry.upperTankLowerLimit
    && latestHeatPumpEntry.upperTankLowerLimit !== upperTankLowerLimit) {
    result.upperTankLowerLimit = upperTankLowerLimit;
  }
  if (latestHeatPumpEntry.UpperTankUpperLimit
    && latestHeatPumpEntry.upperTankUpperLimit !== upperTankUpperLimit) {
    result.upperTankUpperLimit = upperTankUpperLimit;
  }
  return result;
};

/**
 * Parses and signs predetermined heat pump data from a ModBus query result.
 * @return {Object} - contains predetermined signed heat pump data
 */
const parseHeatPumpData = async (data, compressorStatus) => {
  const compressorRunning = compressorStatus === 1;
  const timeStamp = new Date();
  const compressorUsage = await parseCompressorUsage(compressorRunning, moment(timeStamp));
  const limits = await parseTankLimits(data[74], data[75], data[78], data[79], moment(timeStamp));

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
    ...limits,
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
